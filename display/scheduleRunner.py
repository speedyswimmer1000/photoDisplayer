#! /usr/bin/env python

import threading
import sqlite3
from datetime import datetime
import re
import xmltodict
import os
import json
import calendar
import xmlrpclib
import thread
from time import sleep
import Queue

class showScheduler():

    def __init__(self, displayServerInstance):
        # Initially, there are no shows running.
        self.showRunning = False;
        self.showSchedule = []

        # Get the path to the root directory and open the XML parameter file
        self.rootDir = os.path.abspath(os.path.join(os.path.dirname( __file__ ), '..'))
        with open( os.path.join(self.rootDir, 'config', 'params.xml') ) as stream:
            try:
                self.tparams = xmltodict.parse(stream.read())
            except Exception as exc:
                print(exc)
                exit(1)

        # Set up parameters and variables 
        self.lastSavedShows = ''
        self.everyDayNum = 8
        self.weekday_names = list(calendar.day_name)
        self.currentRunningShowName = None
        self.dbUpdated = True
        self.clientCount = 0
        # self.client = xmlrpclib.ServerProxy('http://127.0.0.1:' + self.tparams['params']['serverParams']['displayServerPort'] + '/')

        self.endShowVar = 'End Show'
        self.loadShowVar = 'Load Show'
        self.clientQ = Queue.Queue()
        self.threadToServerQ = Queue.Queue()
        self.threadToServerQ.put(None)

        self.displayServer = displayServerInstance
        # Start the periodic show status checker, which will call checkForSchedules
        # and run logic of what show, if any, should be running currently; it will
        # then sleep for a predetermined length of time (60sec in production) and run
        # again, in perpetuity.
        self.intervalShowStatusChecker()


    def checkForSchedules(self):

        # Open the database where the website stores information about specific
        # shows. 
        webDatabase = self.tparams['params']['websiteParams']['siteDBname']
        dbPath = os.path.join(self.rootDir, 'databases', webDatabase)
#         print dbPath
        conn = sqlite3.connect(dbPath)
        conn.text_factory = str  # For UTF-8 compatibility

        # Get the parameters for the database schema and build the appropriate 
        # query.
        scheduleTable = self.tparams['params']['websiteParams']['siteDBschema']['scheduleTable']
        schTableName = scheduleTable['name']
        showNameCol = scheduleTable['paramNameCol']
        jsonCol = scheduleTable['jsonCol']
        scheduleParamName = scheduleTable['scheduleParamName']
        scheduleQuery = '''SELECT {} FROM {} WHERE {} = "{}"'''.format(jsonCol, schTableName, showNameCol, scheduleParamName)

        # Execute the query and get the results. 
        c = conn.cursor()
        try:
            c.execute(scheduleQuery)
            result = c.fetchall()
        except sqlite3.OperationalError as sqe:
            result = None

        if result is not None and len(result) > 0:
            self.allSavedShows =  json.loads(result[0][0])
        else:
            self.allSavedShows = None

        # Check if the last retrieval from the database matches the current retrieval; if not,
        # then something has changed on the webpage and we need to re-process the output
        # into an array of arrays describing the show. 

        if self.allSavedShows is not None and self.lastSavedShows != self.allSavedShows:
            self.showSchedule = []
            # Save the retrieved show as the last show for future comparison.
            self.lastSavedShows = self.allSavedShows
            for i in range(len(self.allSavedShows)):
                currentShow = self.allSavedShows[i]
                # For each saved show schedule, get the show name and the day of the week.
                # If the dayOfWeek value is "Every Day", then assign it a special value
                # used within the class that signifies every day; otherwise, convert the 
                # text value to a number, 0 == Monday, 6 == Sunday, per calendar and datetime 
                # definitions.
                showName = currentShow['showName']
                dow = currentShow['dayOfWeek']
                startTime = currentShow['startTime']
                stopTime = currentShow['stopTime']

                startRegex = re.match('(\d\d)(\d\d)', startTime)
                startHour = int(startRegex.group(1))
                startMin = int(startRegex.group(2))

                endRegex = re.match('(\d\d)(\d\d)', stopTime)
                endHour = int(endRegex.group(1))
                endMin = int(endRegex.group(2))

                minutesInShow = ( 60 * endHour + endMin - (60 * startHour + startMin) )
                secondsInShow = minutesInShow * 60

                if dow.lower() == 'every day':
                    dowNum = self.everyDayNum
                else:
                    pass
                    try:
                        dowNum = self.weekday_names.index(dow)
                    except Exception as e:
                        print e

                # Pack everything into the showSchedule array of arrays. 
                self.showSchedule.append([dowNum, startTime, stopTime, showName, secondsInShow])

            # If the show is running and we found something new in the database that 
            # wasn't there, let the show schedule tracker know that something has changed. 
            if self.showRunning:
                self.dbUpdated = True

            print self.showSchedule

    def intervalShowStatusChecker(self):
        # Get the list of shows as necessary from the database. The database can update, so it pays
        # to check every time. 
        self.checkForSchedules()

        # Get relevant time and day of week. 
        currentTime = datetime.now().timetuple()
        currentDayNum = datetime.weekday(datetime.now())
        hhmm = '{:02}{:02}'.format(currentTime[3], currentTime[4])
 #       print hhmm

        # print "Show running: {} DB Update: {}".format(self.showRunning, self.dbUpdated)
        if not self.showRunning or self.dbUpdated:
            # Determine whether a show should be running. Takes the first
            # defined valid show. 
            # Reset flags. 
            print "Check: {}".format(self.showSchedule)
            self.dbUpdated = False
            quitShow = True
            for schedule in self.showSchedule:
                dowNumber = schedule[0]
                if dowNumber == 8:
                    dowNumber = currentDayNum
                startTime = schedule[1]
                endTime = schedule[2]
                showName = schedule[3]
                # secondsInShow = schedule[4]
                
                currentTime = datetime.now().timetuple()
                startHour = currentTime[3]
                startMin = currentTime[4]
                endRegex = re.match('(\d\d)(\d\d)', endTime)
                endHour = int(endRegex.group(1))
                endMin = int(endRegex.group(2))
                minutesInShow = ( 60 * endHour + endMin - (60 * startHour + startMin) )
                secondsInShow = minutesInShow * 60   
                print "Seconds in show: {}".format(secondsInShow)

                # For each saved show, check if the time and date are such that that
                # show schedule is in the valid time. 
                if (hhmm >= str(startTime) and hhmm < str(endTime) and dowNumber == currentDayNum):
                    # If it is, save some global variables so that a change to the schedule
                    # but with the same show name won't cause a restart, and that a change
                    # to the time such that the time is valid won't cause a restart. 
                    self.schedule = schedule
                    # Let the logic in the show runner thread determine if a show must be started.
                    print "show may be starting: " + showName
                    self.clientManager(self.loadShowVar, showName, secondsInShow)
                    self.showRunning = True
                    quitShow = False
                    # If a valid show is found, break the for loop. 
                    break

            # If none of the shows fit the criteria (quitShow was not set to False but a show is
            # running), stop the show. 
            if quitShow and self.showRunning:
                print "quit the show"
                self.showRunning = False
                self.clientManager(self.endShowVar, None)

        else:
            # Show is running and nothing has changed in the database; see if it should stop
            dowNumber = self.schedule[0]
            if dowNumber == 8:
                dowNumber = currentDayNum
            startTime = self.schedule[1]
            endTime = self.schedule[2]
            showName = self.schedule[3]
            if (hhmm >= str(endTime) and self.showRunning ):
                print "Show stopping! Quit the show now. "
                self.clientManager(self.endShowVar, None)
                self.showRunning = False
                self.schedule = []
                self.currentRunningShowName = None


        threading.Timer(1.0, self.intervalShowStatusChecker).start()

    def clientManager(self, actionType, showName, secondsInShow = None):
        # Manages the client actions, including error handling, so I don't have to copy-paste
        # everywhere. Should be called as a thread so as not to delay the main threaded function.

        if actionType == self.loadShowVar:
            assert secondsInShow is not None, "Seconds in show requested should be defined when loading show"
        
        self.clientQ.put(self.clientCount) 
        # thread.start_new_thread(self.clientThreader, ())
        thread.start_new_thread(self.clientThreader, (self.clientCount, actionType, showName, secondsInShow))
        self.clientCount += 1

    def clientThreader(self, threadNumber, actionType, desiredShowName, secondsInShow = None):
        # Flush the queue for communication when starting the thread. We don't
        # want old stop commands interfering with the most recent command.
        # First, though, sleep for a second so that the running 
        # thread (if any) can read the stop message off the queue and quit.

        if actionType == self.loadShowVar:
            assert secondsInShow is not None, "Seconds in show requested should be defined when loading show (client threader)"

        threadComplete = False

        while not threadComplete:
            currentSchedulerShowName = self.currentRunningShow()
            showState = self.displayServer.getShowRunningState()
            showStateArray = json.loads(showState)
            showIsRunning = showStateArray[0]
            serverRunningShowName = showStateArray[1]
            print "Show running: {}. Server thinks {} is running, scheduler thinks {} and wants {}".format(showIsRunning, serverRunningShowName, currentSchedulerShowName, desiredShowName)
            try:
                if actionType == self.endShowVar:
                    self.currentRunningShow(None)
                    if showIsRunning and serverRunningShowName == currentSchedulerShowName:
                       # print "ending show" + str(threadNumber)
                        self.displayServer.endSlideshow()
                    else:
                        # Do nothing - there's nothing to kill, and we don't want to
                        # randomly turn off the TV. 
    #                    self.currentRunningShow(None)
                        break
                elif actionType == self.loadShowVar:
                 #   print "loading show " + desiredShowName
                 #   print "Current show running is " + str(serverRunningShowName)
                 #   print "Show is running state: {}".format(showIsRunning)
                    self.currentRunningShow(desiredShowName)

                    if (showIsRunning):
                        # Saved shows are only called from here, and only shows called 
                        # from here will return a non-'None' serverRunningShowName. 
                        if serverRunningShowName is None or serverRunningShowName == desiredShowName:
                            # do nothing, break. We are already running this show.
                            # print "Running a user-defined show." 
                            break
                        else:
                            # print "requesting show {}".format(desiredShowName)
                            threadComplete = True
                            self.displayServer.startNamedSlideshow(desiredShowName, secondsInShow)
                            currentShedulerShowName = desiredShowName
                    else: # There is no show running. 
                        print "requesting show {}".format(desiredShowName)
                        threadComplete = True
                        self.displayServer.startNamedSlideshow(desiredShowName, secondsInShow)
                        currentShedulerShowName = desiredShowName
                    print "Done loading show"
                else:
                    print "Unknown client action"
                threadComplete = True
            except Exception as e:
                # print "no go"
                pass
            highestThread = 0;
            while not self.clientQ.empty():
                item = self.clientQ.get()
                if item >= highestThread:
                    highestThread = item
            if highestThread != threadNumber:
                # Keep only the latest thread number
                threadComplete = True
                print "Stopping thread {}".format(threadNumber)
                self.clientQ.put(highestThread)
            else:
                # Put it back on the queue
                self.clientQ.put(threadNumber)
            sleep(0.5)
        currentSchedulerShowName = self.currentRunningShow()
        showState = self.displayServer.getShowRunningState()
        showStateArray = json.loads(showState)
        showIsRunning = showStateArray[0]
        serverRunningShowName = showStateArray[1]
        print "Show running: {}. Server thinks {} is running, scheduler thinks {} should be running".format(showIsRunning, serverRunningShowName, currentSchedulerShowName)

    def currentRunningShow(self, *inputs):

        if len(inputs) == 0:

            if not self.threadToServerQ.empty():
                currentRunningShowName = self.threadToServerQ.get()
            else:
                currentRunningShowName = None
        else:
            self.threadToServerQ.queue.clear()
            currentRunningShowName = inputs[0]

        self.threadToServerQ.put(currentRunningShowName)
        print "Running show is now {}".format(currentRunningShowName)
        return currentRunningShowName

if __name__ == "__main__":
    aa = showScheduler()
