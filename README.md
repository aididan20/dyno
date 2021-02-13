# Dyno

Date of the original leak: 7th April 2020.

> Only contains the source of the public Dyno bot, that has been added to millions of servers on Discord.
> I am not the one that has leaked this code, it has been leaked by DDoshop before it got taken down.
> API keys are not valid anymore and the code of the bot has been updated since this source has been leaked, so it's not 100% up-to-date.
> I can not help you setting up this bot and i'm not willing to spend time trying to make this bot run. 

You are free to use this code to learn more about Discord bots and Dyno.

Some of the modules used: 


``` 
fs, http, https, chalk, bluebird, require-reload, cluster, async-each, repl, child_process, util, eris, os, moment, hot-shots, axios, blocked, getenv, winston, mongoose-schema-json, dot-object, uuid/v4, eventemitter, events ioredis-lock, jayson, envkey/loader, matomo-tracker, winston-sentry, cluster, prom-client, ioredis, raven, ws, glob-promise, minimatch, eventemitter3
```

```

     
                                          ╔╦╦╦╔
                                       ╔╬╬╬╬╬╬╬╬╬╦
                                     ╔╣╬╬╬╬╬╬╬╬╬╬╬╬╦
                                      ╚╣╬╬╬╬╬╬╬╬╬╬╬╬╬╦,
                                        ╚╣╬╬╬╬╬╬╬╬╬╬╬╬╬╣╕
                                          ╙╣╬╬╬╬╬╬╬╬╬╬╬╬╬╬╦
                            ╔╦╬╬╬╦,         ╙╣╬╬╬╬╬╬╬╬╬╬╬╬╬╬╦
                          ╔╬╬╬╬╬╬╬╬╦╕         "╣╣╬╬╬╬╬╬╬╬╬╬╬╬╬╦
                       ,╦╬╬╬╬╬╬╬╬╬╬╬╬╬╦         `╠╣╬╬╬╬╬╬╬╬╬╬╬╬╬╦
                     ,φ╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╦          ╚╣╬╬╬╬╬╬╬╬╬╬╬╬╬╬,
                   ╓╣╣╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╦          ╚╣╬╬╬╬╬╬╬╬╬╬╬╬╣╬╕
                 ╔╣╣╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╦          ╙╣╬╬╬╬╬╬╬╬╬╬╬╬╬╬╕
               ╔╣╣╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╦╕         ╙╣╣╬╬╬╬╬╬╬╬╬╬╬╬╬╦
             ╦╣╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╦╕         "╟╣╬╬╬╬╬╬╬╬╬╬╬╬╬╦
          .φ╣╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╦╕         '╠╣╬╬╬╬╬╬╬╬╬╬╬╬╬╦
        ,φ╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╦         "╣╬╬╬╬╬╬╬╬╬╬╬╬╬╬╦
       ╔╣╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬         ╘╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬
       ╚╣╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬         ,╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬
        ╙╣╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╝          ╣╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬
          ╙╣╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╩          ╔╣╬╬╬╬╬╬╬╬╬╬╬╬╬╬╙
            "╣╣╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╝          ≡╣╬╬╬╬╬╬╬╬╬╬╬╬╬╬╙
              "╟╣╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╝         ,φ╣╬╬╬╬╬╬╬╬╬╬╬╬╬╬"
                 ╚╣╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╝         ,φ╣╬╬╬╬╬╬╬╬╬╬╬╬╬╩
                   ╚╣╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╝         ╓╣╬╬╬╬╬╬╬╬╬╬╬╬╬╬╩
                     ╙╣╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬          ╔╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╩
                       ╙╣╬╬╬╬╬╬╬╬╬╬╬╬╣╩          ╔╣╣╬╬╬╬╬╬╬╬╬╬╬╬╬╙
                         ╙╣╣╬╬╬╬╬╬╬╬╩          ╔╣╬╬╬╬╬╬╬╬╬╬╬╬╬╬╙
                           `╝╣╬╬╬╬╩         ,φ╣╬╬╬╬╬╬╬╬╬╬╬╬╬╬"
                                          ,φ╬╬╬╬╬╬╬╬╬╬╬╬╬╣╩"
                                        ╔╣╬╬╬╬╬╬╬╬╬╬╬╬╬╬╩
                                      ╔╣╣╬╬╬╬╬╬╬╬╬╬╬╬╬╩
                                     ╣╣╬╬╬╬╬╬╬╬╬╬╬╬╬╙
                                      "╣╣╬╬╬╬╬╬╬╬╬╝
                                         ╙╚╬╬╬╩╙
     
    
---
Dyno (https://dyno.gg)
```
