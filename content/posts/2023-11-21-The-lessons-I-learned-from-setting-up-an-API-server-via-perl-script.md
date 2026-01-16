---
layout: default
title: "The lessons I learned from setting up an API server via perl script"
date: 2023-11-21 21:05:14 -0400
categories:
  - Programming
tags:
  - Perl
  - API
  - IPC
  - debugging
---

## Problem Statement

Recently When I was trying to set up an API server in a perl script to do some unit tests, I met lots of trouble.

In conclusion, the trouble can be classfied as 3 parts:

1. The residual server processes can't be killed properly.
2. Program stucked after launch the API server.
3. stdin, stdout, stderr on windows.

## Error examples

### The residual server processes can't be killed.

```perl
system(perl server.pl daemon -l http://*:0);
```

Use the command above in main test script will launch an API server in a child process. The residual server processes should be killed without any left after the tests. At first I use "system" to run the command, and then kill it in a different system command via:

```bash
ps aux \| grep "xxx" \| awk {print $2}" \| xargs kill
```

However, my tests need to be run on all platform including windows, then it's not possible to use the UNIX/MAC specific command to kill the processes.

Of course I can use

```perl
print "$^0"
```

to detect different OS and use different command to kill them, but I don't because I am afraid of some problem which unspecified platform will show up. I would like to use the naive perl method.

Then the question become how to get the pid from the "system" command in perl, here, I use open3 [https://perldoc.perl.org/IPC::Open3]

The open3 will return a pid number, which could be used by perl to execute:

Kill 'TERM', $pid. which is quiet convenient.

The command is:

```perl
my $pid = open3(my $in, my $out, my $err, "perl server.pl daemon -l http://*:0");
kill 'TERM', $pid;
```

It should be fine to solve the problem, however, then I met the second question: The test is stucked once the child processes launch the API server.

### Program stucked after launch the API server.

This is quiet interesting caused by open3.

open3 will open the subprocess with its stdin, stdout and stderr. However, there is buffer setting in linux terminal(not sure if there is in windows os.). So the buffer always waiting for some output to accumulate and then release them. The api server always waiting for new output, however, it never reached the requirements of the buffer. Then the program stucked.

Two ways to solve the problem:

1. use "unbuffer" to launch the server:

   ```perl
   my $pid = open3(my $in, my $out, my $err, "unbuffer perl server.pl daemon -l http://*:0");
   ```

   However, this can't be done on windows.

2. In the server.pl, add `|=1` to force flush buffer.

It should solve the problem of stucked program.

However, new problem showed up:

The server.pl still alive after successfully tests.

I can still use `ps aux | grep "server.pl"` to find 4-5 processes.

After careful thinking, I made an experiment which I will comment the "kill" in each tests, and after running the tests I found the residual processes have twice than before. This means the open3 launch not only 1 subprocess but 2.

The reason is that the _ couldn't been recognized by the open3 command, so open3 launch the command "perl server.pl daemon -l http://_:0" as a string via a bash subprocess, which run sh -c "perl server.pl daemon -l http://\*:0". Thus, we know the reason behind it was we just kill the bash subprocess, not the server process.

The fix is easy: replace it with "localhost" or "127.0.0.1".

### problem on windows

Until this step, everything works fun on linux, however, on windows, the program stucked.

After investigation, I found the windows prefer the syntax:

```perl
open3(my *IN, my *OUT, my *ERR, $cmd);
```

It was solved very easily. But I spent a lot of time on it.

## Conclusion

Even if this is just a not so hard unit test, I spent a lot of time to deal with the async problem, IPC problem, the stand output and error log problem. These things are very tricky to deal with.
