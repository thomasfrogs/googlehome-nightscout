// Copyright 2016, Google, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// [START app]
'use strict';

process.env.DEBUG = 'actions-on-google:*';

// Die if APIAI_CLIENT_TOKEN is not defined
if (typeof process.env.APIAI_CLIENT_TOKEN === 'undefined' ||
  process.env.APIAI_CLIENT_TOKEN === '') {
  console.log('error: APIAI_CLIENT_TOKEN is not set');
  process.exit(1);
}

let ActionsSdkAssistant = require('actions-on-google').ActionsSdkAssistant;
let apiai = require('apiai');
let express = require('express');
let bodyParser = require('body-parser');

// Set global noInput phrases to share between intent modules
global.noInput = ['What\'s next?', 'How can I help you?', 'Try saying help'];

// Load intent handlers
var currentMetric = require('./intents/currentMetric')
  , finish = require('./intents/finish')
  , help = require('./intents/help')
  , insulinRemaining = require('./intents/insulinRemaining')
  , lastLoop = require('./intents/lastLoop')
  , noMatch = require('./intents/noMatch')
  , pumpBattery = require('./intents/pumpBattery')
  , uploaderBattery = require('./intents/uploaderBattery')
  , tempHum = require('./intents/tempHum')
  , greetBro = require('./intents/greetBro')
  , chuckNorris = require('./intents/chuckNorris');

// Define intents
const CURRENT_METRIC = 'CURRENT_METRIC';
const FINISH = 'FINISH';
const HELP = 'HELP';
const INSULIN_REMAINING = 'INSULIN_REMAINING';
const LAST_LOOP = 'LAST_LOOP';
const NO_MATCH = 'NO_MATCH';
const PUMP_BATTERY = 'PUMP_BATTERY';
const TEMP_HUM = 'TEMP_HUM';
const UPLOADER_BATTERY = 'UPLOADER_BATTERY';
const GREET_BRO = 'GREET_BRO';
const CHUCK_NORRIS = 'CHUCK_NORRIS';
const RAW_INTENT = 'raw.input';

let app = express();
app.set('port', (process.env.PORT || 8080));
app.use(bodyParser.json({ type: 'application/json' }));

app.post('/', function (request, response) {
  console.log('handle post');
  const assistant = new ActionsSdkAssistant({ request: request, response: response });
  // Use for API.AI sessionid parameter
  let id = request.body.conversation.conversation_id;

  function mainIntent(assistant) {
    console.log('mainIntent');
    let inputPrompt = assistant.buildInputPrompt(true, '<speak>Hi, this is Nightscout! ' +
      'What can I help you with? </speak>', noInput);
    assistant.ask(inputPrompt, state);
  }

  function rawInput(assistant) {
    console.log('rawInput = ' + assistant.getRawInput());
    if (assistant.getRawInput() === 'bye') {
      assistant.tell('Goodbye!');
    } else {
      let languageProcessor = apiai(process.env.APIAI_CLIENT_TOKEN);
      var apiaiReq = languageProcessor.textRequest(assistant.getRawInput(), {
        sessionId: id
      });
      apiaiReq.on('response', function (response) {
        // Call handler
        console.log('API.AI detected intent as ' + response.result.metadata.intentName);
        switch (response.result.metadata.intentName) {
          case CURRENT_METRIC:
            currentMetric.handler(assistant)
            break;
          case FINISH:
            finish.handler(assistant)
            break;
          case HELP:
            help.handler(assistant)
            break;
          case INSULIN_REMAINING:
            insulinRemaining.handler(assistant)
            break;
          case LAST_LOOP:
            lastLoop.handler(assistant)
            break;
          case PUMP_BATTERY:
            pumpBattery.handler(assistant)
            break;
          case TEMP_HUM:
            tempHum.handler(assistant)
            break;
          case UPLOADER_BATTERY:
            uploaderBattery.handler(assistant)
            break;
          case GREET_BRO:
            greetBro.handler(assistant)
            break;
          case CHUCK_NORRIS:
            chuckNorris.handler(assistant)
            break;
          default:
            noMatch.handler(assistant)
            break;
        }
      });
      apiaiReq.on('error', function (error) {
        console.log(error);
        noMatch.handler;
      });
      apiaiReq.end();
    }
  }

  // get state object and modify it
  let state = assistant.getDialogState();

  // ActionMap used for deep links at invocation time
  let actionMap = new Map();
  actionMap.set(assistant.StandardIntents.MAIN, mainIntent);
  actionMap.set(assistant.StandardIntents.TEXT, rawInput);
  actionMap.set(RAW_INTENT, rawInput);
  actionMap.set(CURRENT_METRIC, currentMetric.handler);
  actionMap.set(FINISH, finish.handler);
  actionMap.set(HELP, help.handler);
  actionMap.set(INSULIN_REMAINING, insulinRemaining.handler);
  actionMap.set(LAST_LOOP, lastLoop.handler);
  actionMap.set(PUMP_BATTERY, pumpBattery.handler);
  actionMap.set(UPLOADER_BATTERY, uploaderBattery.handler);

  assistant.handleRequest(actionMap);
});

// Start the server
let server = app.listen(app.get('port'), function () {
  console.log('App listening on port %s', server.address().port);
  console.log('Press Ctrl+C to quit.');
});
// [END app]
