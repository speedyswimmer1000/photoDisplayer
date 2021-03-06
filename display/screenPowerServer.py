#! /usr/bin/env python

import subprocess
import shlex
import re
import thread
import Queue
import sys
import termios
import pexpect
import threading
from time import sleep
import time
import os
from SimpleXMLRPCServer import SimpleXMLRPCServer
from SimpleXMLRPCServer import SimpleXMLRPCRequestHandler

class RequestHandler(SimpleXMLRPCRequestHandler):
    rpc_paths = ('/',)


class tvStateManager():

    def __init__(self):
        self.server = SimpleXMLRPCServer(("0.0.0.0", 8543),
                                    requestHandler=RequestHandler)
        self.server.register_introspection_functions()
      
        self.process = pexpect.spawn('cec-client')
        
        self.commandQueue = Queue.Queue()
        self.cecQueue = Queue.Queue()
        self.powerQueue = Queue.Queue()
        self.activeQueue = Queue.Queue()
        self.askOnQueue = Queue.Queue()
        
        self.dir_path = os.path.dirname(os.path.realpath(__file__))
        
        self.desiredState = 'off'

        self.stateSafeSemaphore = threading.Lock()
        
        self.powerSemaphore = threading.Lock()
        self.stateSemaphore = threading.Lock()
        self.powerDesiredSemaphore = threading.Lock()
        self.powerState = 'off'
        self.activeState = 'unknown'
        self.desiredPowerState = 'unknown'
              
        
        thread.start_new_thread(self.__tv_state_monitor__, () )
        thread.start_new_thread(self.__command_reader__, (self.process,) )
        thread.start_new_thread(self.__cec_output_consumer__, (self.process,) )
        thread.start_new_thread(self.__tvRequestedThread__, () )
       
        self.displayingStartImage = False
        self.__determine_unknown_state__()
      

    def run(self):
        self.server.register_function(self.toggleScreen, 'toggleScreen')
        self.server.register_function(self.turnOnScreen, 'turnOnScreen')
        self.server.register_function(self.turnOffScreen, 'turnOffScreen')
        self.server.register_function(self.askForTvOn, 'askForTvOn')
        self.server.serve_forever()



    def __determine_unknown_state__(self):
      # Initialization run
        sleep(10)
        
        print "starting determine state"
        powerState = self.__getPowerState__()
        activeState = self.__getActiveState__()
        if not self.displayingStartImage: 
            imgname = os.path.join(self.dir_path, 'dontpanic.png')
            self.imshow = subprocess.Popen(['/usr/local/bin/feh', '-ZxF', imgname]) 
        self.displayingStartImage = True
        
        # Sleep 10 seconds if necessary
        print "Active state: {}, Power State: {}".format(activeState, powerState)
        if activeState == 'raspi' or activeState == 'not_raspi':
            print "Have our answer"
            self.imshow.kill()
            self.displayingStartImage = False
            # imshow.terminate()
            self.turnOffScreen()
            return # We have our answer 
        if powerState == 'on' or powerState == 'unknown': 
            # Don't want to mess with currently powered on TV - either it's
            # on the right input already or we don't want to hijack the TV from someone. 
            threading.Timer(5, self.__determine_unknown_state__).start()
        else: # Power is off
            if powerState == 'off':
                self.turnOnScreen()
    
                activeState = self.__getActiveState__()
                powerState = self.__getPowerState__()
    
                
                if activeState == 'raspi' :
                  print "Computer state is known as raspi - turning off screen"
                  self.turnOffScreen()
    
                if activeState == 'raspi' or activeState == 'not_raspi':
                  print "Done" 
                  self.imshow.terminate()
                  self.displayingStartImage = False
                  return
                else:
                  print "Try, try again"
                  print "Computer state is {}, power state is {}".format(activeState, powerState)
                  # Try, try again
                  threading.Timer(5, self.__determine_unknown_state__).start()
                
            else:  # Shoot, someone turned the TV back on. Try again later. 
                # Try, try again
                threading.Timer(5, self.__determine_unknown_state__).start()
                  
    def __cec_output_consumer__(self, process):
      # This thread will block, but that's OK because the only thing it does is 
      # consume and put on the queue.
      # Reads the output of CEC-client and puts it on a queue.
      while 1:
        try:
            stdout = self.process.readline()
            stdout = stdout.lower().rstrip()
            self.cecQueue.put(stdout)
            #print stdout 
        except pexpect.exceptions.TIMEOUT:
            pass
    
    def __command_reader__(self, process):
      # Only reads off data from the cec process, since it will block if there
      # is no new data
      # desiredPowerState = 'off'
      while 1:
        
        # Not sure why, but we need this sleep for a bit at the very beginning.
        sleep(1)

        # Workaround to check if the queue is empty - see if there is
        # something to read with a nonblocking call   
              
        powerState = self.__getPowerState__()
        activeState = self.__getActiveState__()
        desiredState = self.__getDesiredPowerState__()
        
        if not self.commandQueue.empty():
            
            command = self.commandQueue.get(False)
            
            print "Power is {}, active is {}, desired is {}, command is {}".format(powerState, activeState, desiredState, command)
            if command == 'toggle' and (activeState == 'raspi' or powerState == 'off'):
                if powerState == 'on':
                    self.__setDesiredPowerState__('off')
                else:
                    self.__setDesiredPowerState__('on')
                # print "Asked for power to toggle"
            elif command == 'turnOn' and powerState == 'off':
                self.__setDesiredPowerState__('on')
                # print "Asked for power on"
            elif command == 'turnOff' and activeState == 'raspi' and powerState == 'on':
                self.__setDesiredPowerState__('off')
                # print "Asked for power off"
            else :
                pass
                # Not in the right state or the command isn't valid
                print 'Rejecting command because TV is not on computer input'
            
        if powerState == 'on':
            if desiredState == 'off':
                self.process.sendline('standby 0')
              #  print "Turning off"
            else:
                pass # Do nothing, we're where we want to be.
        else:
            if desiredState != 'on' :
                pass # do nothing 
            else:
                self.process.sendline('as')
            
    def __setDesiredPowerState__(self, desired_state):
        self.powerDesiredSemaphore.acquire()
        self.desiredPowerState = desired_state
        self.powerDesiredSemaphore.release()  
        
    def __getDesiredPowerState__(self):
        self.powerDesiredSemaphore.acquire()
        desired_state = self.desiredPowerState 
        self.powerDesiredSemaphore.release()   
        
        return desired_state
        
    def __setPowerState__(self, state_val):
        self.powerSemaphore.acquire()
        self.powerState = state_val
        self.powerSemaphore.release()
        
    def __getPowerState__(self):
        self.powerSemaphore.acquire()
        powerState = self.powerState
        self.powerSemaphore.release()
        
        return powerState
        
    def __setActiveState__(self, state_val):
        self.stateSemaphore.acquire()
        self.activeState = state_val
        self.stateSemaphore.release()
                        
    def __getActiveState__(self):
        self.stateSemaphore.acquire()
        activeState = self.activeState
        self.stateSemaphore.release()
        
        return activeState
    
    def __tv_state_monitor__(self):

      lastRead = time.time()
      standby_requested = False
      active_requested = False
      while 1:
        if not self.cecQueue.empty():
        
            lastRead = time.time()
            stdout = self.cecQueue.get()
            # print stdout
            
            if re.match(".*as$", stdout):
                print stdout
                # print "as requested"
                active_requested = True
            if re.match(".*standby 0.*", stdout):
                # print "standby requested"
                standby_requested = True
            
            if re.match(".*?power status changed.*to 'on'.*?", stdout) or re.match(".*in transition from standby to on.*", stdout):
                # print "Power turned on"
                # Clear the queue
                self.__setPowerState__('on')
                # Put the latest state in the queue
                # print "Putting power on"
                if not standby_requested:
                    pass
                    self.__setDesiredPowerState__('on')
                active_requested = False
              
            elif re.match(".*?power status changed.*to 'standby'.*?", stdout):
                # print "Power turned off"
                # Clear the queue
                
                # Put the latest state in the queue
                # print "Putting power off"
                if not standby_requested:
                    pass
                    self.__setDesiredPowerState__('off')
                standby_requested = False
                
                self.__setPowerState__('off')
              
            elif re.match(".*?making tv.*the active source.*?", stdout):
                pass
                # print "raspi is not the active source"
                # Put the latest state in the queue
               #  print "Putting not_raspi"
                self.__setActiveState__('not_raspi')
            elif re.match(".*?making recorder.* the active source.*?", stdout):
                pass
                # print "raspi is the active source"
                # Put the latest state in the queue
                # print "Putting raspi"
                self.__setActiveState__('raspi')
        else:
            sleep(0.1)
            if (time.time() - lastRead) > 3.5:
                pass   
                

    def toggleScreen(self):
        self.commandQueue.put('toggle', False)
        return True
        pass
      
    def turnOnScreen(self):
        print "turning on screen..."
        self.commandQueue.put('turnOn', False)
        return True
      
    def turnOffScreen(self, killRequest=True):
        print "Turning off screen, kill request = {}".format(killRequest)
        self.commandQueue.put('turnOff', False)
        if killRequest:
            self.askOnQueue.put(-1)
        return True
        
    def askForTvOn(self, nextNSeconds):
        self.askOnQueue.put(nextNSeconds)
        pass
        return True
      
    ## This should be a thread with a loop, fed by a queue. 
    def __tvRequestedThread__(self):
        next_n_seconds = 0
        waitTime = 3
        sleep(10)
        
        powerState = self.__getPowerState__()
        activeState = self.__getActiveState__()
        lastPowerState =  self.__getPowerState__()
        lastActiveState = self.__getActiveState__()
        while 1:
        
            powerState = self.__getPowerState__()
            activeState = self.__getActiveState__()
            if not self.askOnQueue.empty():
                n_sec_request = self.askOnQueue.get()
                # print "{} seconds requested".format(n_sec_request)
                if n_sec_request > 0 or n_sec_request == -1:
                    next_n_seconds = n_sec_request
                    
                ## Edge case: if we request a turnOffScreen, it puts a -1 in the queue, and
                # so the askTvOn should quit. The TV turnoff is already requested in turnOffScreen, though.
            
            # print "Next n seconds: {}".format(next_n_seconds)
                
            if next_n_seconds > 0:
                next_n_seconds -= waitTime
                
                ## This should be in this loop because otherwise it will trigger
                ## the screen turning off every time this loop runs. Bad news. 
                if next_n_seconds <= 0:
                    self.turnOffScreen(False)
                
               #  print "{} seconds left".format(next_n_seconds)
                
               #  print "Last power: {} This power: {} Last active: {} This active: {}".format(lastPowerState, powerState, lastActiveState, activeState)
                               
                if powerState == 'off' and lastPowerState == 'on' and activeState == 'raspi':
                    print "Deactivating tvon"
                    next_n_seconds = -1  # Remote turned the TV off when doing the slideshow
                elif powerState == 'on' and activeState == 'raspi':
                    pass
                    # Good, we're in the state we need to be in.
                elif activeState != 'raspi' and powerState == 'on':
                    pass
                    # Not on the raspberry pi and TV is on
                else: #  powerState == 'off'
                    # print "Turning on TV as asked for"
                    self.turnOnScreen()
                   # threading.Timer(nextNSeconds, self.turnOffScreen).start()
            
            sleep(3)
            lastActiveState = activeState
            lastPowerState = powerState
      
if __name__ == "__main__":  
    ccl = tvStateManager()
    ccl.run()
'''
    while 1:
        sys.stdout.flush()
        termios.tcflush(sys.stdin, termios.TCIFLUSH)
        filename = raw_input()
        if filename.lower() == 'on':
            ccl.turnOnScreen()
        elif filename.lower() == 'toggle':
            ccl.toggleScreen()
        elif filename.lower() == 'off':
            ccl.turnOffScreen()
        elif filename.lower() == 'askon':
            ccl.askForTvOn(30)
'''

