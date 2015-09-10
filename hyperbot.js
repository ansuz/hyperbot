// libraries
var irc=require("irc");
var ansuz=require("ansuz");
var level=require("level");
var agml=require("agml");
var fs=require("fs");

// command line arguments
var args=process.argv.slice(2);

if(require.main === module){
    var configPath=args[0]||'./config.agml';

    // where you'll put configuration
    var config=[];

    // load and parse configuration variables
    agml.parse(fs.readFileSync(configPath,'utf-8'),config);

    var bots=config.map(makeBot);
}else{
    module.exports={
        makeDb:makeDb,
        makeBot:makeBot,
        mimicUser:mimicUser,
        fed:fed,
        profileUser:profileUser,
        increment:increment,
        chooseWeighted:chooseWeighted,
    };
}

function makeDb(path){
    return level(path);
};

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
            floodProtection: cfg.floodProtection=='true',
            floodProtectionDelay: cfg.floodProtection=='true'?parseInt(cfg.floodProtectionDelay||'1000'):undefined,
        });
        db=level(cfg.db);
    }catch(err){
        console.log(err);
    }

    bot.addListener('error',function(message){
        console.error('ERROR: %s: %s', message);
    });

    var names={};
    bot.addListener('names',function(channel,nicks){
        // track who's in the room
        console.log("In channel %s:",channel);
        console.log("Found the users %s",typeof nicks == 'object'?JSON.stringify(nicks):nick);
        names[channel]=names[channel]||{};

        Object.keys(nicks).forEach(function(nick){
            names[channel][nick]=nicks[nick];
        });
    });

    bot.addListener('join',function(channel,nick,message){
        // add the nick to names
        console.log("[JOIN] %s :: %s; %s", channel,nick,JSON.stringify(message));
        names[channel]=names[channel]||{};

        names[channel][nick]="";

        // log user, host, and nick info
        // bidirectional relationships:
          // user <-> host
    });

    bot.addListener('part',function(channel,nick,reason,message){
        // remove the nick from names
        console.log("[PART] %s :: %s; %s; %s", channel,nick,message,reason);
        if(names&&names[channel]&&names[channel][nick]){
            delete names[channel][nick];
        }
    });

    bot.addListener('quit', function(nick,reason,channel,message){
        // remove the nick from names
        console.log("[QUIT] \nchannel:%s;\nnick%s;\nmessage%s;\nreason%s", channel,nick,typeof message=='object'?JSON.stringify(message):message,reason);
        if(names&&names[channel]&&names[channel][nick]){
            delete names[channel][nick];
        }
    });

    bot.addListener('kick', function(nick,by,reason,message){
        // remove the nick from names
        console.log("[KICK]\nnick:%s;\nby:%s;\nreason:%s;\nmessage:%s\n",nick,by,reason,message);
        if(names&&names[channel]&&names[channel][nick]){
            delete names[channel][nick];
        }
    });

/*
    bot.addListener('nick',function(oldnick,newnick,channels,message){
        // remove old nick, add new nick
        console.log("[nick] %s changed to %s in [%s] with message '%s'",oldnick,newnick,channels.join(', '),message)
        if(names&&names[channel]&&names[channel][oldnick]){
            delete names[channel][oldnick];
        }
        names[channel]=names[channel]||{};
        names[channel][newnick]="";
    });
*/

/////////////////////////////////////////////////////////////////////

    bot.addListener('topic',function(channel,topic,nick,message){

    });

    bot.addListener('pm',function(from,to,text,type,message){

    });

    bot.addListener('-mode',function(channel,by,mode,argument,message){

    });

    bot.addListener('-mode',function(channel,by,mode,argument,message){

    });


    bot.addListener('action',function(from,to,text,message){
        
    });

    // what does the bot need to listen for?
    var registered={};

    var commands={
        mimic:function(opt){
            var len=opt.tokens.length;
            if(opt.tokens.length == 1){
                mimicUser(opt.db,{
                    nick:stripBad({
                        nick:opt.tokens[i+1]||opt.from,
                        drop:opt.drop,
                    }),
                    channel:opt.to,
                    bot:opt.bot,
                });
            }else{
                for(var i=0;i<len;i++){
                    if(opt.tokens[i+1]){
                        mimicUser(opt.db,{
                            nick:stripBad({
                                nick:opt.tokens[i+1]||opt.from,
                                drop:opt.drop,
                            }),
                            channel:opt.to,
                            bot:opt.bot,
                        });
                    }
                }
            }
        },
        feds:function(opt){
            fed(db,{
                channel:opt.to,
                bot:opt.bot,
                names:opt.names[opt.to]||{},
                drop:opt.drop,
            });
        },
        help:function(opt){
            // TODO load a docstring out of the first comment in the function
            // hint, use ansuzjs
            var helpline=Object.keys(registered).slice(0,-1).map(function(cmd){
                return '"'+cmd+'"';
            }).join(', ');
            bot.say(opt.to,opt.from+': try one of ['+helpline+']');
        },
        slap:function(opt){
            bot.action(opt.to,"slaps "+opt.from);
        },
        default:function(opt){
            profileUser(opt.db,{
                nick:       opt.from,
                channel:    opt.to,
                message:    opt.message,
                drop:       opt.drop||'',
            });
        },
    };

    Object.keys(commands).forEach(function(command){
        // TODO do the following only if the command exists in a list
        // of registered plugins on a per-network basis

        // register the command with the appropriate prefix
        registered[cfg.prefix+command]=commands[command];
    });

    // consider making this message# so as to exclude PMs
    bot.addListener('message', function(from,to,message){
        var tokens=message.split(/\s+/);
        var opt={
            db:db,
            from:from,
            to:to,
            message:message,
            tokens:tokens,
            drop:cfg.drop,
            names:names,
            bot:bot,
            prefix:cfg.prefix,
        };
//        console.log(opt);
        (registered[tokens[0]]||commands.default)(opt);
    });

    return {
        bot: bot,
        config:cfg,
        db:db,
    };
};

function stripBad(opt){
    var drop=opt.drop?new RegExp('['+opt.drop+']+$'):/^$/,
        nick=opt.nick.replace(drop,'').replace(/^[@_\-+]+/,'');
        return nick;
};


function send(client,command,arg1,arg2,arg3){
    client.send(command,arg1,arg2,arg3);
};

function op(opt){
    // channel, nick(s);
    opt.bot.send('MODE', opt.channel, '+o', opt.nick);
};

function join(opt){

};

function fed(db,opt){
    // channel, bot,names 
    if(!(opt.channel && opt.names && opt.drop )){
        console.log("Not enough arguments provided to 'fed'");
        return;
    }
    db.get('profiles', function(err,value){
        var profiles=JSON.parse(value);
        // get a list of profiles that have been active in this channel
        var inChannel=profiles
        .filter(function(profile){
            return new RegExp(opt.channel+'$').test(profile);
        })
        // strip the channel portion of the profile
        .map(function(profile){
            return stripBad({
                drop:opt.drop,
                nick:profile.replace(/#.+/,''),
            });
        });

        // get a list of users that are currently in the channel and
        // determine users for whom you have no data
        var feds=Object.keys(opt.names).filter(function(name){
            return inChannel.indexOf(name) === -1;
        });

        // announce to the channel that those users are most likely feds
        if(feds.length){
            opt.bot.say(opt.channel,"The following users are probably feds: ["+feds.join(", ")+"]");
        }else{
            opt.bot.say(opt.channel,"I'm not sure which users in this channel, if any, are feds. Nevertheless, remain vigilant!");
        }
    });
};

function profileUser(db,opt){
    // unpack your vars to make things easy and be non-destructive
    // TODO optimize out the copied variables later
    var drop=opt.drop?new RegExp('['+opt.drop+']+$'):/^$/,
        nick=opt.nick.replace(drop,'').replace(/^[@_\-+]+/,''),
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
//            console.log(profiles);
            if(profiles.indexOf(prefix) == -1){
//                console.log("UPDATING PROFILES");
//                console.log(JSON.stringify(profiles));
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
        ((opt.callback||(function(input){opt.bot.say(opt.channel, input)}))
            (runningData.phrase.join(" ")));
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
//            console.log(prefix+"seeds");
            if(err){
                // there are no known seeds, so there's nothing you can do
                opt.bot.say(opt.channel,"I'm not familiar with "+opt.nick);
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
