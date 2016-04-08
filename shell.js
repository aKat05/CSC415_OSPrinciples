var shell = [
    [set, ["stdin", "/dev/input"]],
    [open, ["stdin", "r", "fp"]],
    [set, ["stdout", "/dev/tty0"]],
    [set, ["stderr", "/dev/tty0"]],
    [open, ["stdout", "r+", "fp2"]],
//loop
    [set, ["prompt", "user@jsos / $\n"]],
    [write, ["fp2", "prompt"]],
    [read, ["fp", "buffer", 100]],
    [write, ["fp2", "buffer"]], //echo keystrokes
    [set, ["argv", ""]],    //argv for process to be executed
    //parse input, split tokens by whitespace and store in "argv"
    [function(pcb, argv) {
            if(pcb.get("buffer").length === 0) {
                pcb.pc = 6; //next instr 7
                return;
            }
            var args = pcb.get("buffer").split(/[ \n]+/);
            pcb.set("argv", args);
    }, []],
    //validate tokens, "argv"[0] should be a valid command
    [function(pcb, argv) {
            var command = pcb.get("argv")[0];
            if(command.length === 0) {
                //empty string
                pcb.set("buffer", "");
            } else if ((fs.getFile(command) !== undefined) ||
                    (fs.getFile(pcb.workingdir + command) !== undefined)) {
                //executable file
                pcb.set("buffer", "");
                pcb.pc = pcb.pc + 2;    //goto execute
            } else {
                var str = "";
                //interpret shell-specific commmands here
                switch(command) {
                    case "exit":
                    default:
                        str = command + ": command not found\n";
                        break;
                }
                pcb.set("buffer", str);
            }
    }, []],
    [write, ["fp2", "buffer"]],
//goto loop
    [function(pcb, argv) {
            pcb.pc = 4; //next instr 5
    }, []],
//execute
    //find file in filesystem and execute, pass arguments
    [createChildProcess, ["argv"]],
    //wait for child to finish
    [function(pcb, argv) {
            if(pcb.children.length > 0) {
                pcb.state = "waiting";
                pcb.pc = pcb.pc - 1;    //this instr
                setTimeout(function() { pcb.state = "ready"; }, 50);
            }
    }, []],
//goto loop
    [function(pcb, argv) {
            pcb.pc = 4; //next instr 5
    }, []]
];

fs.put("/shell", shell);
