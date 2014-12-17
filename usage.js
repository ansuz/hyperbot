var $=require("./support");

/*  this script assumes you've used grep to find all messages from a particular person on irc.
    I just ran the following command:
    grep "< reptoidz>" ~/irclogs/hypeirc/* > reptoidz.txt
*/

// pass the filename at the command line
var filename=process.argv[2]||
  console.log("try passing an irssi log name as an argument")||
  process.exit(0);

// load the file
var input=$.load(filename);

// each line has output from grep as to where the text originated
// let's remove it
// it's formatted like:
// '#hyperboria.log:13:46 '+restOfLine
var lines=input.split("\n") // split by newlines
  .map(function(line){
    // this also changes "< reptoidz>" to "<reptoidz>"
    // that's important, since I split by whitespace...
    return line.replace(/#.*\.log:[0-9]{2}:[0-9]{2} < /g,"<");
  })
  .join(" <eol> ")+" <eol>"; // each line ends with "<eol>"

$.write(
  filename+".data.json"
  ,$.countWordPairs(lines)
);
