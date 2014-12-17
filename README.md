# Mimic your friends in three easy steps!

## grep your irssi logs

```Bash
grep "< reptoidz>" ~/irclogs/hypeirc/* > reptoidz.txt
```

## process the resulting file into a json object

```Bash
node convert.js reptoidz.txt
```

## Generate a phrase

```Bash
node phrase.js ./reptoidz.txt.data.json "<reptoidz>"
```

In the above command, the first argument is the file you want to use. You need to prepend it with `./` because this is all a dirty hack.

The second argument is the first token. I'm using "<reptoidz>" since all of the lines started with that token.
