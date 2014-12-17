var $={};
var fs=require("fs");

$.load=function(path){
  return fs.readFileSync(path,"utf8");
};

$.write=function(name,date){
  fs.writeFileSync(name,data);
};

$.countWordPairs=function(corpus){
  var pairs={};
  var count={};
  var A=corpus
    .split(/\s+/)
    .map(function(x){
      return x.toLowerCase();
    })
    .filter(function(word){
      return word;
    })
    .reduce(function(a,b){
      count[a]=(count[a]||0)+1;
      pairs[a]=pairs[a]||{};
      pairs[a][b]=(pairs[a][b]||0)+1;
      return b;
    });
  return {
    pairs:pairs
    ,count:count
  };
};

$.sortWordsByCount=function(count){
  var A=Object.keys(count);
  A.sort(function(a,b){
    return count[b]-count[a];
  });
  return A;
};

module.exports=$;
