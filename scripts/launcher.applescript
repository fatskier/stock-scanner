-- Launcher for the US Equity Breakout Scanner.
-- Starts a wrapper script that runs `npm run dev` and watches THIS app's
-- PID. If the user clicks Stop, quits with Cmd+Q, or force-quits, the
-- wrapper kills the dev server and frees the port.

property serverPort : 3000
property scannerPath : "/Users/cook/Claude/stock-scanner"
property logFile : "/tmp/stock-scanner.log"

on run
    set serverUrl to "http://localhost:" & (serverPort as string)
    set wrapperPath to scannerPath & "/scripts/server-wrapper.sh"

    -- If the port is already taken, just open the browser and warn.
    set portTaken to false
    try
        do shell script "/usr/sbin/lsof -ti tcp:" & (serverPort as string)
        set portTaken to true
    end try

    if portTaken then
        do shell script "open " & quoted form of serverUrl
        try
            display dialog "Port " & (serverPort as string) & " is already in use." & return & return & ¬
                "Opened the browser, but this launcher won't manage that process." ¬
                buttons {"OK"} default button "OK" with title "Stock Scanner" with icon caution
        end try
        return
    end if

    -- Capture this AppleScript app's own PID so the wrapper can watch it.
    set myPID to do shell script "echo $PPID"

    -- Spawn the wrapper detached, passing our PID.
    try
        do shell script "/bin/bash " & quoted form of wrapperPath & " " & myPID & ¬
            " " & quoted form of scannerPath & ¬
            " " & (serverPort as string) & ¬
            " " & quoted form of logFile & ¬
            " > /dev/null 2>&1 < /dev/null &"
    on error errMsg number errNum
        display alert "Couldn't launch wrapper" message ("[" & errNum & "] " & errMsg) as critical
        return
    end try

    -- Wait up to ~90s for the dev server to come up.
    set ready to false
    repeat 90 times
        try
            do shell script "/usr/bin/curl -sf " & serverUrl & " -o /dev/null"
            set ready to true
            exit repeat
        on error
            delay 1
        end try
    end repeat

    if not ready then
        display alert "Stock Scanner didn't start" message "See " & logFile & " for details." as warning
        return
    end if

    do shell script "open " & quoted form of serverUrl

    -- Block until the user clicks Stop or Cmd+Q's the app.
    -- Either way, when this script process exits the wrapper detects
    -- the parent is gone and kills the dev server.
    try
        display dialog "Stock Scanner is running at" & return & serverUrl & return & return & ¬
            "Click Stop to shut down the server and free port " & (serverPort as string) & "." ¬
            buttons {"Stop"} default button "Stop" with title "Stock Scanner" with icon note
    end try
end run

on quit
    -- Belt-and-braces: explicit kill in case the wrapper is slow.
    try
        do shell script "/usr/sbin/lsof -ti tcp:" & (serverPort as string) & ¬
            " | /usr/bin/xargs /bin/kill -TERM 2>/dev/null || true"
    end try
    continue quit
end quit
