/*
 * Copyright 2018-2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located: http://www.apache.org/licenses/LICENSE-2.0
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

// Alexa Dice Skill

// sets up dependencies
const Alexa = require('ask-sdk-core');
const i18n = require('i18next');
const AWS = require('aws-sdk');
const persistenceAdapter = require('ask-sdk-s3-persistence-adapter');
const {
  DynamoDbPersistenceAdapter,
} = require('ask-sdk-dynamodb-persistence-adapter');

const dynamoDbPersistenceAdapter = new DynamoDbPersistenceAdapter({
  tableName: 'Users',
  partitionKeyName: 'userId',
});

// core functionality for fact skill
const GetNewFactHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    // checks request type
    return (
      request.type === 'LaunchRequest' ||
      (request.type === 'IntentRequest' &&
        request.intent.name === 'GetNewFactIntent')
    );
  },
  async handle(handlerInput) {
    const requestAttributes = await handlerInput.attributesManager
      .getRequestAttributes()
      .setPersistentAttributes(s3Attributes)
      .getPersistentAttributes();

    let s3Attributes = { counter: 10 };
    await attributesManager;
    let speechOutput = `Hi there, Hello World! Your saved counter is ${s3Attributes.counter}`;
    // gets a random fact by assigning an array to the variable
    // the random item from the array will be selected by the i18next library
    // the i18next library is set up in the Request Interceptor
    const randomFact = requestAttributes.t('FACTS');
    console.log('randomFact', randomFact);
    // concatenates a standard message with the random fact

    const getDynamoAttributes = dynamoDbPersistenceAdapter.getAttributes({
      tableName: 'Users',
    });

    // const getS3Attributes =
    //   (await attributesManager.getPersistentAttributes()) || {};
    // console.log('s3Attributes is: ', getS3Attributes);

    const counter = getS3Attributes.hasOwnProperty('counter')
      ? getS3Attributes.counter
      : 0;

    let currentCount = `Hi there, Hello World! Your counter is ${counter}`;

    const speakOutput =
      requestAttributes.t('GET_FACT_MESSAGE') +
      randomFact +
      'savedCount' +
      speechOutput +
      'currentCount:' +
      currentCount;

    console.log('getDynamoAttributes', getDynamoAttributes);

    return (
      handlerInput.responseBuilder
        .speak(speakOutput)
        // Uncomment the next line if you want to keep the session open so you can
        // ask for another fact without first re-opening the skill
        // .reprompt(requestAttributes.t('HELP_REPROMPT'))
        .withSimpleCard(requestAttributes.t('SKILL_NAME'), randomFact)
        .getResponse()
    );
  },
};

// core functionality for GetNewDiceRoll
const GetNewDiceRollHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    // checks request type
    return (
      request.type === 'LaunchRequest' ||
      (request.type === 'IntentRequest' &&
        request.intent.name === 'GetNewDiceRollIntent')
    );
  },
  handle(handlerInput) {
    console.log('hit GetNewDiceRollHandler!');
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    const getDynamoAttributes = dynamoDbPersistenceAdapter.getAttributes({
      tableName: 'Users',
    });

    console.log('getDynamoAttributes', getDynamoAttributes);
    // gets a random fact by assigning an array to the variable
    // the random item from the array will be selected by the i18next library
    // the i18next library is set up in the Request Interceptor
    const randomDiceRoll = requestAttributes.t('DICE');
    console.log(randomDiceRoll);
    // concatenates a standard message with the DICE_ROLL
    const speakOutput =
      requestAttributes.t('GET_DICE_MESSAGE') + randomDiceRoll;

    return (
      handlerInput.responseBuilder
        .speak(speakOutput)
        // Uncomment the next line if you want to keep the session open so you can
        // ask for another fact without first re-opening the skill
        // .reprompt(requestAttributes.t('HELP_REPROMPT'))
        .withSimpleCard(requestAttributes.t('SKILL_NAME'), randomDiceRoll)
        .getResponse()
    );
  },
};

const HelpHandler = {
  // detects if the incoming request is an IntentRequest
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return (
      request.type === 'IntentRequest' &&
      request.intent.name === 'AMAZON.HelpIntent'
    );
  },
  handle(handlerInput) {
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    return handlerInput.responseBuilder
      .speak(requestAttributes.t('HELP_MESSAGE'))
      .reprompt(requestAttributes.t('HELP_REPROMPT'))
      .getResponse();
  },
};

const FallbackHandler = {
  // The FallbackIntent can only be sent in those locales which support it,
  // so this handler will always be skipped in locales where it is not supported.
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return (
      request.type === 'IntentRequest' &&
      request.intent.name === 'AMAZON.FallbackIntent'
    );
  },
  handle(handlerInput) {
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    return handlerInput.responseBuilder
      .speak(requestAttributes.t('FALLBACK_MESSAGE'))
      .reprompt(requestAttributes.t('FALLBACK_REPROMPT'))
      .getResponse();
  },
};

const ExitHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return (
      request.type === 'IntentRequest' &&
      (request.intent.name === 'AMAZON.CancelIntent' ||
        request.intent.name === 'AMAZON.StopIntent')
    );
  },
  handle(handlerInput) {
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    return handlerInput.responseBuilder
      .speak(requestAttributes.t('STOP_MESSAGE'))
      .getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    console.log(
      `Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`
    );
    return handlerInput.responseBuilder.getResponse();
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`Error handled: ${error.message}`);
    console.log(`Error stack: ${error.stack}`);
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    return handlerInput.responseBuilder
      .speak(requestAttributes.t('ERROR_MESSAGE'))
      .reprompt(requestAttributes.t('ERROR_MESSAGE'))
      .getResponse();
  },
};

const LocalizationInterceptor = {
  process(handlerInput) {
    // Gets the locale from the request and initializes i18next.
    const localizationClient = i18n.init({
      lng: handlerInput.requestEnvelope.request.locale,
      resources: languageStrings,
      returnObjects: true,
    });
    // Creates a localize function to support arguments.
    localizationClient.localize = function localize() {
      // gets arguments through and passes them to
      // i18next using sprintf to replace string placeholders
      // with arguments.
      const args = arguments;
      console.log('args: ', args);
      const value = i18n.t(...args);
      // If an array is used then a random value is selected
      if (Array.isArray(value)) {
        console.log('array value: ', value);
        return value[Math.floor(Math.random() * value.length)];
      }

      console.log('value: ', value);
      return value;
    };
    // this gets the request attributes and save the localize function inside
    // it to be used in a handler by calling requestAttributes.t(STRING_ID, [args...])
    const attributes = handlerInput.attributesManager.getRequestAttributes();
    attributes.t = function translate(...args) {
      return localizationClient.localize(...args);
    };
  },
};

const skillBuilder = Alexa.SkillBuilders.custom();

// entry point for lambda function. route all inbound request to your skill
exports.handler = skillBuilder
  .addRequestHandlers(
    GetNewFactHandler,
    GetNewDiceRollHandler,
    HelpHandler,
    ExitHandler,
    FallbackHandler,
    SessionEndedRequestHandler
  )
  .addRequestInterceptors(LocalizationInterceptor)
  .addErrorHandlers(ErrorHandler)
  .withCustomUserAgent('sample/basic-fact/v2')
  .withPersistenceAdapter(
    new persistenceAdapter.S3PersistenceAdapter({
      bucketName: process.env.S3_PERSISTENCE_BUCKET,
      s3Client: new AWS.S3({
        apiVersion: 'latest',
        region: process.env.S3_PERSISTENCE_REGION,
      }),
    })
  )
  .lambda();

// It is organized by language/locale.  You can safely ignore the locales you aren't using. Update the name and messages to align with the theme of your skill

const enData = {
  translation: {
    SKILL_NAME: 'Roll Dice',
    GET_FACT_MESSAGE: 'The dice number you rolled is: ',
    HELP_MESSAGE:
      'You can say tell roll the dice, or, you can say exit... What can I help you with?',
    HELP_REPROMPT: 'What can I help you with?',
    REPROMPT: 'Roll again?',
    FALLBACK_MESSAGE:
      "The Roll Dice skill can't help you with that.  This skill allows you to play a game if you say roll the dice. What can I help you with?",
    FALLBACK_REPROMPT: 'What can I help you with?',
    ERROR_MESSAGE: 'Sorry, an error occurred.',
    STOP_MESSAGE: 'Goodbye!',
    FACTS: ['1', '2', '3', '4', '5', '6'],
  },
};

const enusData = {
  translation: {
    SKILL_NAME: 'Roll Dice',
  },
};

// constructs i18n and l10n data structure
const languageStrings = {
  en: enData,
  'en-US': enusData,
};
