#! /usr/bin/perl

use params;
use File::Find;
require 'readInImages.pl';
use File::HomeDir;
use DateTime;
use Encode qw(decode encode);
use Cwd;

use warnings;
use strict; 

# $SIG{INT} = \&dying;

sub dying { 
	print 'Not today here either!\n';
	exit;
}

#############  REUSABLE METHODS  ##################################

sub getUniqueSubdirs{
##############
# Next step: Get a list of all files in the directory and its subdirectories. This will exclude directories that are under other root directories. We will populate two hashes: a %dirNameNumHash, which will give us the root directory's key number for each directory, and a %dirNameRelativeToHash, which gives us the subdirectory relative to the root directory.

# For example, with a directory structure like:
# /main
# /main/testa
# /main/testb
# /main/testc
#
# where /main/testc is already included from a previous inclusion and we are currently adding /main,
# we will get e.g. 2 for the /main directory number. Our directories that will be included are
# /main/testa and /main/testb (but not /main/testc, because it's been seen already). Then, by grepping out the
# root name, we will get dirNamesRelativeToRootHash of testa and testb. 

	my $base_directory = $_[0];

	our $localDBHandle = DBI->connect("DBI:SQLite:$params::database", "user" , "pass");

	my @file_list;

	my %dirNameNumHash; 
	my %dirNameRelativeToRootHash;
	# I don't understand this following line; source is http://www.perlmonks.org/?node_id=677380. 
	# The line gets the list of all images by relative directory from $base_directory. 

	my %subdirhash;
	# find(sub { push @file_list, $File::Find::name }, $base_directory);

	$File::Find::dont_use_nlink = 1; # Required to traverse network attached drives.
	find({wanted=> sub{ dir_names(\%subdirhash, $base_directory) }}, $base_directory );

# print Dumper(%hash);

	my @subdirectories;
	foreach my $directory (sort {lc $a cmp lc $b} keys %subdirhash) {
	    # printf "%-8s\n", $directory;
	    my $tdr = $directory;
		if ($params::OS_type == $params::linuxType){
			$tdr = "\/" . $tdr . "\/";
		}
	    if ($tdr ne $base_directory){
	    	push @subdirectories, $directory;
	    }
	}

	# Copy the subdirectories into remainingSubdirs, which we can then remove from with impunity in a for loop. 
	my @remainingSubdirs = @subdirectories;

	my $directoryKeyVal;

	for (my $i = 0; $i < scalar @subdirectories; $i++){
		# Query the database to see if it has this specific subdirectory already. If so, get it's key value and put it in $directoryKeyVal.
		# Remember that we've taken out this specific root directory, so we are in no danger of removing legitimate subdirectories.
		my $utf_subdir = decode('utf8',$subdirectories[$i]);
		# if ($params::OS_type == $params::linuxType){
		# 	$utf8
		# }
		my $dirExistsQuery = qq/SELECT $params::rootKeyColumn FROM $params::rootTableName WHERE $params::rootDirPath = "$utf_subdir"/;
		my $query = $localDBHandle->prepare($dirExistsQuery);

		until(
			$query->execute()
		){
			warn "Can't connect: $DBI::errstr. Pausing before retrying.\n";
			warn "Failed on the following query: $dirExistsQuery\n";
			sleep(5);
		}

		$directoryKeyVal = eval { $query->fetchrow_arrayref->[0] };

		# Now, if the subdirectory is already accounted for, get its key number and base directory and add it to the appropriate hashes. Then remove it and all its subdirectories from the @remainingSubdirs list. 
		if (defined $directoryKeyVal and $directoryKeyVal ne "" ){

			# The directory exists, and we need to do something about it.
			# Remove this directory and its subdirectories from the list of remaining subdirectories. 
			# Because of the magic of grep, we will remove subdirectories of the root directory automatically.
			@remainingSubdirs = grep(!/$subdirectories[$i]/, @remainingSubdirs);

		}
	}

	# Output at this level: A list of all subdirectories of the added directory here, not including subdirectories of other included root directories. 

	# Push the root directory back on the remaining directories.
	push(@remainingSubdirs, $base_directory);

	# We already have the directoryKeyVal from inserting the root directory (we can't get here if we didn't just add the directory.) We will also remove the $base_directory from the subdirectories that are remaining to give us a relative directory.
	foreach my $val (@remainingSubdirs){
		$val =~ s/$base_directory//g;
		$dirNameNumHash{$val} = $directoryKeyVal;
		$dirNameRelativeToRootHash{$val} = $base_directory;
	}

	$localDBHandle->disconnect;

	return @remainingSubdirs;

}


sub dir_names {
# print "$File::Find::dir\n" if(-f $File::Find::dir,'/');
	my $base_directory = $_[1];
	my $dir = $File::Find::dir;
	$dir =~ s/$base_directory//;
	$dir =~ s/^\\//;
	$dir =~ s/^\///;
	# print $dir . "\n";
	if ($dir !~ m/\.git/ ){
		$_[0]->{$dir} = 1;
	}
}

sub addFilesInListOfSubdirs{
#### Find a list of the files that are in each subdirectory. Call the readImages method on each of the files. 

	my @subdirectories = @{$_[0]}; 
	my $dirKeyVal = $_[1];
	my $rootDirectory = $_[2];
	my $numPassed = $_[3];
	my $portNum = $_[4];
	my $dbhandle = ${$_[5]};
	my $methodsttime = ${$_[6]};



	# Create a tmp table with only necessary columns. Shows ~25% speedup. 
	# createTmpTable();

	# our $tmpDBhandle = DBI->connect("DBI:SQLite:$params::database", "user" , "pass");

	our %insertedDateHash;

	# Only selecting the keyVal that's relevant in this sub so as to avoid conflicts. 
	my $tableHashQuery = qq/SELECT $params::photoFileColumn, $params::insertDateColumn FROM $params::photoTableName WHERE $params::rootDirNumColumn = $dirKeyVal/;
	my $query = $dbhandle->prepare($tableHashQuery);
	until(
		$query->execute()
	){
		warn "Can't connect: $DBI::errstr. Pausing before retrying.\n";
		warn "Failed on the following query: $tableHashQuery\n";
		sleep(5);
	}

	my ($fileName, $insertDate);
	$query->bind_col(1, \$fileName);
	$query->bind_col(2, \$insertDate);

	while($query->fetch){
		$insertedDateHash{$fileName} = $insertDate;
	}

	foreach my $localDir (@subdirectories){
		my @filesInDir;
		my $odir = $rootDirectory . $localDir;
		print "dir is " . $odir . "\n";
		if ( !($odir =~ m/\/$/ ) ) {
			print OUTPUT "$odir isn't a valid directory. \n";
		}
		opendir my $dir, "$odir" or next; #print "$odir isn't a valid directory. \n";
		# 	next;
		# } #die "Can't open directory " . $odir . ": $!";
		@filesInDir = readdir $dir;

		closedir $dir; 

		if ($params::debug and $params::debugNewRoot) { print $localDir . "\t: "; } # grep(!/$subdirectories[$i]/, @subdirectories);
		@filesInDir =  grep(/\.JPE?G/i, @filesInDir);
		if ($params::debug and $params::debugNewRoot) { print join(',  ', @filesInDir) . "\n\n"; }

		if ($localDir ne "" ){
			$localDir .= "/";
		}

		my %nameHash;
		foreach my $imageFile (@filesInDir){
			${$numPassed} += 1;
			if (${$numPassed} % 500 == 0){
				print "We have read ${$numPassed} files and processed them accordingly.\n";
			}

			# my $sttime = [gettimeofday];
			readOneImage({
				baseDirName => $rootDirectory, 
				fileName => $localDir . $imageFile, 
				baseDirNum => $dirKeyVal,
				nameHash => \%nameHash,
				dbhandle => \$dbhandle,
				insertedDateHash => \%insertedDateHash,
				portNum => $portNum
			});
			my $entime = time;#DateTime->now;
			my $elapse = $entime - $methodsttime;
			if ($elapse > $params::totalTimeElapseSeconds){
				print "Need to exit now. Time elapsed is : " . $elapse . " seconds.\n";
				require 'trimDeletedFiles.pl'; # Automatically runs the trim.
				exit();
			}
			# my $elapse = tv_interval($sttime);
			
		}

	}

}

sub checkOSFolder{

	my ($args) = @_;

	my $winRootDir = $args->{winRootDir};
	my $linRootDir = $args->{linRootDir};
	my $dbhandle = $args->{dbhandle};
	my $rootKey = $args->{rootKey};
	my $root_dir;

	if ($params::OS_type == $params::windowsType){

		if ($winRootDir eq "" or !-e $winRootDir){
			my $mw = MainWindow->new;
			$mw->withdraw;  # Hide the main window.
			$mw->messageBox(-title => 'Warning', -message => "The directory field for your OS (Windows) is unpopulated. Please select the correct directory. The corresponding Linux directory is $linRootDir.", -type=>'OK');
			while (!defined $winRootDir or $winRootDir eq "" or !-e $winRootDir){
				$winRootDir = $mw->chooseDirectory(-title=>"Directory corresponding to $linRootDir.", -initialdir=>File::HomeDir->my_home);

				if (!defined $winRootDir or $winRootDir eq "" or !-e $winRootDir){

					my $answer = $mw->messageBox(-title => 'Please Reply', 
					     -message => 'It looks like you want to exit the program. Would you like to do so?', 
					     -type => 'YesNo', -icon => 'question', -default => 'yes');
					my $answerBool = (lc($answer) eq 'yes') ? 1 : 0;
					if ($answerBool){
						exit();
					}
				}
			}

			$winRootDir .= '/';

			print $winRootDir . "\n";

			# Add to database.
			my $utf_winRootDir = decode('utf8',$winRootDir);
			my $update_query = qq/UPDATE $params::rootTableName SET $params::windowsRootPath = "$utf_winRootDir" WHERE $params::rootKeyColumn = $rootKey/;
			my $query = $dbhandle->prepare($update_query);
			until(
				$query->execute()
			){
				warn "Can't connect: $DBI::errstr. Pausing before retrying.\n";
				warn "Failed on the following query: $update_query\n";
				sleep(5);
			}# or die $DBI::errstr;

			print "Updated" . "\n";
			
		}
		$root_dir = $winRootDir ;
	}else{
		if ($linRootDir eq "" or !-e $linRootDir){
			my $mw = MainWindow->new;
			$mw->withdraw;  # Hide the main window.
			$mw->messageBox(-title => 'Warning', -message => "The directory field for your OS (Linux) is unpopulated. Please select the correct directory. The corresponding Linux directory is $winRootDir.", -type=>'OK');
			while (!defined $linRootDir or $linRootDir eq "" or !-e $linRootDir){
				$linRootDir = $mw->chooseDirectory(-title=>"Directory corresponding to $winRootDir.", -initialdir=>File::HomeDir->my_home);


				if (!defined $linRootDir or $linRootDir eq "" or !-e $linRootDir){

					my $answer = $mw->messageBox(-title => 'Please Reply', 
					     -message => 'It looks like you want to exit the program. Would you like to do so?', 
					     -type => 'YesNo', -icon => 'question', -default => 'yes');
					my $answerBool = (lc($answer) eq 'yes') ? 1 : 0;
					if ($answerBool){
						exit();
					}
				}
			}

			$linRootDir .= '/';

			# Add to database.
			my $utf_linRootDir = decode('utf8',$linRootDir);
			my $update_query = qq/UPDATE $params::rootTableName SET $params::linuxRootPath = "$utf_linRootDir"/;
			my $query = $dbhandle->prepare($update_query);
			until(
				$query->execute()
			){
				warn "Can't connect: $DBI::errstr. Pausing before retrying.\n";
				warn "Failed on the following query: $update_query\n";
				sleep(5);
			}# or die $DBI::errstr;

			print "Updated" . "\n";
		}
		$root_dir = $linRootDir;
	}

	return $root_dir ;
}


1;
