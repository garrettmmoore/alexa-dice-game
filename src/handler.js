const Alexa = require('ask-sdk');
const dbUtility = require('./helpers/dbUtility');
const dynamoDBTableName = 'GameScores';

// Start the session
const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  async handle(handlerInput) {
    const attributesManager = handlerInput.attributesManager;
    const sessionAttributes = attributesManager.getSessionAttributes();

    if (Object.keys(sessionAttributes).length === 0) {
      sessionAttributes.totalScore = 0;
    }

    // initialize total score as a sessionAttribute to keep track of score
    attributesManager.setSessionAttributes(sessionAttributes);

    const speechText =
      'Welcome to Dice Roller! Would you like to roll the dice?';
    const repromptText =
      'You can also listen to the top 10 scores. Simply say get top scores.';

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(repromptText)
      .getResponse();
  },
};

const YesIntent = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.YesIntent'
    );
  },
  async handle(handlerInput) {
    const { attributesManager, responseBuilder } = handlerInput;
    const sessionAttributes = attributesManager.getSessionAttributes();

    // randomize dice roll
    const diceNumber = Math.floor(Math.random() * (7 - 1) + 1);

    // increment the session if dice number is valid (between 2-6)
    if (diceNumber !== 1) {
      sessionAttributes.totalScore += diceNumber;
      return responseBuilder
        .speak(
          `You rolled a ${diceNumber}! Your total score is ${sessionAttributes.totalScore}. Roll again?`
        )
        .reprompt('Roll again?')
        .getResponse();
    }

    // game is over
    if (diceNumber === 1) {
      const finalScore = sessionAttributes.totalScore;
      // reset totalScore
      sessionAttributes.totalScore = 0;
      attributesManager.setSessionAttributes(sessionAttributes);

      return responseBuilder
        .speak(
          'Darn! You rolled a 1 so that is game over. Your final score is ' +
            finalScore +
            '. Would you like to play again?'
        )
        .reprompt(`Would you like to play again?`)
        .getResponse();
    }
  },
};

const NoIntent = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.NoIntent'
    );
  },
  async handle(handlerInput) {
    const { attributesManager } = handlerInput;
    const sessionAttributes = attributesManager.getSessionAttributes();

    attributesManager.setSessionAttributes(sessionAttributes);

    return handlerInput.responseBuilder
      .speak('Thanks for playing!')
      .getResponse();
  },
};

const AddUserIntentHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name === 'AddUserIntent'
    );
  },
  async handle(handlerInput) {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    const { responseBuilder } = handlerInput;
    // get the user's unique id
    const userID = handlerInput.requestEnvelope.context.System.user.userId;
    const slots = handlerInput.requestEnvelope.request.intent.slots;
    const firstName = slots.FirstName.value;

    // add the user's score to the database
    return dbUtility
      .addUserScore(firstName, userID, sessionAttributes.totalScore)
      .then((data) => {
        const speechText =
          'If you would like to add your name to the top score list, please say your name.';

        return responseBuilder
          .speak(speechText)
          .reprompt(
            'If you would like to add your name to the top score list, please say your name.'
          )
          .getResponse();
      })
      .catch((err) => {
        console.log('Error occured while saving user', err);
        const speechText =
          'Unable to save your information right now. Please try again.';
        return responseBuilder.speak(speechText).getResponse();
      });
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
