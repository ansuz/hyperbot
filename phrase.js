var argv=process.argv.slice(2);
var argc=argv.length;

if(argc==0){
    console.log("node hyperbot.js <db> <user> <channel>");
    process.exit(1);
}

var hyperbot=require("./hyperbot.js");

var db=hyperbot.makeDb(argv[0]);

hyperbot.mimicUser(db,{
    nick:argv[1],
    channel:argv[2],
    callback:function(x){console.log(x);},   
});
