/* 
 * Kevin Valenzuela
 * CSC 415 Fuhrman
 */

//20 vectors (all (1,2))
//sum of the vectors should be (20,40)
fs.data["vector_data.csv"] = "\
1,2\n\
1,2\n\
1,2\n\
1,2\n\
1,2\n\
1,2\n\
1,2\n\
1,2\n\
1,2\n\
1,2\n\
1,2\n\
1,2\n\
1,2\n\
1,2\n\
1,2\n\
1,2\n\
1,2\n\
1,2\n\
1,2\n\
1,2\
"

var calcVectors =
[
    [open, ["vector_data.csv", "r", "fp"]],
    [read, ["fp", "buffer", 1000]],
    [close, ["fp"]],
    [function(pcb, argv) {
        var arr = pcb.get("buffer").split("\n");
        var x = 0, y = 0;
        for (var i = 0; i < arr.length; i++) {
            var vec = arr[i].split(",");
            x += parseFloat(vec[0]);
            y += parseFloat(vec[1]);
        }
        var str = x.toString() + "," + y.toString();
        pcb.set("buffer", str);
    }, []],
    [open, ["vector_data.csv", "w", "fp2"]],
    [write, ["fp2", "buffer"]],
    [close, ["fp2"]]
];
