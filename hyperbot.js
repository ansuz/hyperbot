// libraries
var irc=require("irc");
var ansuz=require("ansuz");
var level=require("level");
var agml=require("agml");
var fs=require("fs");

// command line arguments
var args=process.argv.slice(2);
var configPath=args[0]||'./config.agml';

// where you'll put configuration
var config=[];

// load and parse configuration variables
agml.parse(fs.readFileSync(configPath,'utf-8'),config);

var bots=config.map(makeBot);

function makeBot(cfg,index){
    console.log("setting up %sth network",index);
    console.log(cfg);

    var bot,db;

    // good old try/catch
    try{
        console.log("Connecting to %s",cfg.name);
        bot=new irc.Client(cfg.network,cfg.nick,{
            debug:cfg.debug||false,
            channels: cfg.channels.split(','),
        });
        db=level(cfg.db);
    }catch(err){
        console.log(err);
    }

    bot.addListener('error',function(message){
        console.error('ERROR: %s: %s', message.command, message.args.join(""));
    });

    // the mimic function
    // message listeners here...
    bot.addListener('message', function(from,to,message){
        console.log({
            from:from,
            to:to,
            message:message,
        });

        // what does the bot need to listen for?
        // ~mimic, ~help

        var tokens=message.split(/\s+/);
        switch(tokens[0]){
            case '~mimic':
                mimicUser(db,{
                    nick:tokens[1]||from,
                    channel:to,
                    bot:bot,
                });
                break;
            case '~help':
                bot.say(to,"commands: ~mimic (name), ~help");
                break;
            default:
                profileUser(db,{
                    nick:from,
                    channel: to,
                    message:message,
                    drop: cfg.drop||'',
                });
        }
    });

    return {
        bot: bot,
        config:cfg,
        db:db,
    };
};

function profileUser(db,opt){
    // unpack your vars to make things easy and be non-destructive
    // TODO optimize out the copied variables later
    var drop=opt.drop?new RegExp('['+opt.drop+']+$'):/^$/,
        nick=opt.nick.replace(drop,''),
        channel=opt.channel, 
        message=opt.message;

    // prepare your key
        // to do this you need to have figured out your naming scheme
    // prepare your value
        // to do this you need to have figured out your data structure

    // the key is the concatenation of the user's nick and their channel
    var prefix=nick+channel;

    // keep a running list of all the nick/channel combos you've seen

    db.get('profiles',function(err,value){
        if(err){
            // no profiles for this server yet
            db.put('profiles',JSON.stringify([prefix]),function(err){
                if(err){
                    console.error("[ERROR] we were unable to initialize the profile list for this server");
                }else{
                    //
                }
            });
        }else{
            var profiles=(typeof value == 'string')?JSON.parse(value):value;
            console.log(profiles);
            if(profiles.indexOf(prefix) == -1){
                console.log("UPDATING PROFILES");
                console.log(JSON.stringify(profiles));
                profiles.push(prefix);
                db.put('profiles',JSON.stringify(profiles),function(err){
                    if(err){
                        console.log("[ERROR]: we were unable to update the profile list for this server");
                    }
                });
            }
        }
    });

//**************************************************

    var words=(['<begin>'].concat(message.split(/\s+/))).concat(['<end>']);

    // for every combination of words including <begin> and <end>
    words.reduce(function(first,second,index,array){
        if(index===1){
            // populate this user's seed db
            var seedKey=prefix+"::seeds";
            increment({
                db:db,
                key:seedKey,
                value:second
            });
        }
        // nothing comes after '<end>'
        if(second == '<end>'){
            return;
        }else{
            var word=array[index+1];
        }

        if(word){
            // create a key using the prefix and the two words..
            var key=prefix+'::'+[first,second].join('->');

            // function increment(opt){ // db, key, value, noExist, failure, success
            console.log(key);
            increment({
                db:db,
                key:key,
                value:word,
            });
        }
        return second;
    });
};

function mimicUser(db,opt){
    // nick, channel, bot, seed???
    var prefix=opt.nick+opt.channel+'::';

    var runningData={
        start:['<begin>'],
        remaining:75,
        phrase:[
            '<'+opt.nick+'>',
        ],
    };

    // prepare a callback for after you know what your seed will be
    function onceSeeded(seed){
        var result="";
        runningData.start.push(seed);
        runningData.phrase.push(seed)
        runningData.remaining--;
        nextWord();
    };

    function onceDone(){
        opt.bot.say(opt.channel, runningData.phrase.join(" "));
    };

    function nextWord(){
        if(runningData.remaining){
            db.get(prefix+(runningData.start.join("->")),function(err,value){
                if(err){
                    // something went wrong
                    // need more field data to guess what it could be
                    console.error("[ERROR] %s",err);
                }else{
                    runningData.remaining--;
                    // you must have gotten a value back
                    // you should expect that it's JSON
                    var words=JSON.parse(value);

                    var next=chooseWeighted(words);

                    if(next == '<end>'){
                        onceDone();
                    }else{
                        runningData.phrase.push(next);
                        runningData.start.shift();
                        runningData.start.push(next);
                        nextWord();
                    }
                }
            });
        }else{
            console.log("Maximum phrase length exceeded. Ending generation phase NOW");
            onceDone();
        }
    };

    if(opt.seed){
        // a seed was provided, so use it
        onceSeeded(seed);
    }else{
        // choose a random seed
        db.get(prefix+"seeds",function(err,value){
            console.log(prefix+"seeds");
            if(err){
                // there are no known seeds, so there's nothing you can do
                opt.bot.say(opt.channel,"I'm not sure who you want me to mimic");
            }else{
                // you have some seeds
                var seeds=JSON.parse(value);

                // choose one of them
                var seed=chooseWeighted(seeds);

                // execute the callback
                onceSeeded(seed);
            }
        });
    }
};

// increment
function increment(opt){ // db, key, value, (noExist), (failure), (success), (update), (default)
    var update=opt.update||function(val){
        var res=(typeof val == 'string')?  JSON.parse(val):val||opt.default||{};
        
        res[opt.value]=(res[opt.value]||0)+1;
        opt.db.put(opt.key, JSON.stringify(res), function(err){
            if(err){
                (opt.failure||console.error)("[failure]: "+err);
            }else{
                if(opt.success){
                    opt.success(res);
                }
            }            
        });
    };

    opt.db.get(opt.key, function(err,val){
        if(err){
            // handle the error that occurs 
            (opt.noExist||console.error)("[noExist]: "+err);
            update();
        }else{
            update(val);
        }
    });
};

// choose which word out of a tally of their occurrences
function chooseWeighted(weights){
    var choices=ansuz.flatten(Object.keys(weights).map(function(word){
        return ansuz.range(weights[word]-1).map(function(){
            return word;
        });
    }));
    var total=choices.length;
    return choices[ansuz.die(total)];
}
