var datafile=process.argv[2]||
  console.log("need more dataz")||
  process.exit(0);

var first=process.argv[3]||
  console.log("pass a token with which to start")||
  process.exit(0);

var data=require(datafile);

var range=function(n){
  var t=[];
  for(var i=0;i<n;i++)
    t.push(i);
  return t;
};

var flatten=function(A){
  return A.reduce(function(a,b){
    return a.concat(b);
  });
};

//console.log(data);

var ranked=Object.keys(data.count)
  .sort(function(a,b){
    return data.count[b]-data.count[a];
  });

//console.log(ranked);

var next=function(word){
  var prob=data.pairs[word];
  var choices=flatten(Object.keys(prob)
    .map(function(word){
      return range(prob[word])
        .map(function(){
          return word;
        });
    }));
  var total=choices.length;
  return choices[Math.floor(Math.random()*total)];
};

//console.log(next(ranked[0]));

var makePhrase=function(first){
  var result=[];
  var current=first;
  result.push(current);
  while(current!="<eol>"){
    current=next(current);
    result.push(current);
  }
  return result.slice(0,-1).join(" ");
};


console.log(makePhrase(first));
