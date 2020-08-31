const Alexa = require('ask-sdk');
const { dbAddUserScore, dbGetTopScores } = require('./helpers/dbUtility');
const dynamoDBTableName = 'GameScores';
const LocalizationInterceptor = require('./helpers/interceptor.js');

// Start the session
const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  async handle(handlerInput) {
    const { attributesManager, responseBuilder } = handlerInput;
    const sessionAttributes = attributesManager.getSessionAttributes();
    const requestAttributes = attributesManager.getRequestAttributes();
    const speechText = requestAttributes.t('LAUNCH_MESSAGE');
    const repromptText = requestAttributes.t('LAUNCH_REPROMPT');

    if (Object.keys(sessionAttributes).length === 0) {
      sessionAttributes.totalScore = 0;
      sessionAttributes.previousScore = 0;
    }

    attributesManager.setSessionAttributes(sessionAttributes);

    return responseBuilder
      .speak(speechText)
      .reprompt(repromptText)
      .getResponse();
  },
};

// Roll the dice and keep track of total score
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
    const requestAttributes = attributesManager.getRequestAttributes();
    const randomDiceNumber = Math.floor(Math.random() * (7 - 1) + 1);

    if (randomDiceNumber !== 1) {
      sessionAttributes.totalScore += randomDiceNumber;

      const speechText = `You rolled a ${randomDiceNumber}! Your total score is ${sessionAttributes.totalScore}. Roll again?`;
      const repromptText = requestAttributes.t('ROLL_REPROMPT');

      // increment the session if dice number is valid (between 2-6)
      return responseBuilder
        .speak(speechText)
        .reprompt(repromptText)
        .getResponse();
    }

    // game is over
    if (randomDiceNumber == 1) {
      // store total score before the value is reset
      const finalScore = sessionAttributes.totalScore;

      speechText = `Darn! You rolled a 1 so that's game over. Your final score is ${finalScore}. You can also say, add me to the leaderboard. Otherwise, would you like to start a new game? `;

      repromptText = requestAttributes.t('ROLL_REPROMPT_FAIL');

      // set previousScore in session state to reference when saving the user
      sessionAttributes.previousScore = finalScore;
      // reset totalscore
      sessionAttributes.totalScore = 0;
      attributesManager.setSessionAttributes(sessionAttributes);

      return responseBuilder
        .speak(speechText)
        .reprompt(repromptText)
        .getResponse();
    }
  },
};

// Exit the game
const NoIntent = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.NoIntent'
    );
  },
  async handle(handlerInput) {
    const { attributesManager, responseBuilder } = handlerInput;
    const sessionAttributes = attributesManager.getSessionAttributes();
    const requestAttributes = attributesManager.getRequestAttributes();
    const speechText = requestAttributes.t('NO_MESSAGE');

    attributesManager.setSessionAttributes(sessionAttributes);

    return responseBuilder.speak(speechText).getResponse();
  },
};

// Add User information to DynamoDB
const AddUserIntentHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name === 'AddUserIntent'
    );
  },
  async handle(handlerInput) {
    const { responseBuilder, attributesManager } = handlerInput;
    const sessionAttributes = attributesManager.getSessionAttributes();
    const requestAttributes = attributesManager.getRequestAttributes();
    const userID = handlerInput.requestEnvelope.context.System.user.userId;
    const slots = handlerInput.requestEnvelope.request.intent.slots;
    const firstName = slots.FirstName.value;
    const speechText = requestAttributes.t('ADD_USER_MESSAGE');
    const repromptText = requestAttributes.t('ADD_USER_REPROMPT');
    const currentScore =
      sessionAttributes.totalScore == 0
        ? sessionAttributes.previousScore
        : sessionAttributes.totalScore;

    // db helper to save the user's
    return dbAddUserScore(firstName, userID, currentScore)
      .then((data) => {
        return responseBuilder
          .speak(speechText)
          .reprompt(repromptText)
          .getResponse();
      })
      .catch((err) => {
        const errorText = requestAttributes.t('ADD_USER_ERROR');
        console.log('Error occured while saving user: ', err);
        return responseBuilder.speak(errorText).getResponse();
      });
  },
};

// Query the db for the top 10 scores
const GetTopScoresIntentHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name === 'GetTopScoresIntent'
    );
  },
  async handle(handlerInput) {
    const { attributesManager, responseBuilder } = handlerInput;
    const requestAttributes = attributesManager.getRequestAttributes();
    let speechText = 'The top ten scores are ';
    const repromptText = requestAttributes.t('GET_TOP_SCORES_REPROMPT');

    return dbGetTopScores()
      .then((data) => {
        if (data.length === 0) {
          speechText = requestAttributes.t('GET_TOP_SCORES_EMPTY');
        } else {
          const scores = [];
          // get the top 10 scores an
          data.map((user) => {
            const topScore = user['TopScore']['N'];
            scores.push(`${topScore}`);
          });

          speechText += scores.join(', ');
        }

        return responseBuilder
          .speak(speechText)
          .reprompt(repromptText)
          .getResponse();
      })
      .catch((err) => {
        const errorText = requestAttributes.t('GET_TOP_SCORES_ERROR');
        console.log('Unable to get top scores: ', err);
        return responseBuilder.speak(errorText).getResponse();
      });
  },
};

const HelpIntentHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent'
    );
  },
  handle(handlerInput) {
    const { attributesManager, responseBuilder } = handlerInput;
    const requestAttributes = attributesManager.getRequestAttributes();
    const speechText = requestAttributes.t('HELP_MESSAGE');
    const repromptText = requestAttributes.t('HELP_REPROMPT');
    return responseBuilder
      .speak(speechText)
      .reprompt(repromptText)
      .getResponse();
  },
};

const CancelAndStopIntentHandler = {
  canHandle(handlerInput) {
    const inputRequest = handlerInput.requestEnvelope.request;
    return (
      inputRequest.type === 'IntentRequest' &&
      (inputRequest.intent.name === 'AMAZON.CancelIntent' ||
        inputRequest.intent.name === 'AMAZON.StopIntent')
    );
  },
  handle(handlerInput) {
    const { attributesManager, responseBuilder } = handlerInput;
    const requestAttributes = attributesManager.getRequestAttributes();
    const speechText = requestAttributes.t('EXIT_MESSAGE');
    return responseBuilder.speak(speechText).getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    const { responseBuilder } = handlerInput;
    console.log(`SessionEnded: ${handlerInput.requestEnvelope.request.reason}`);
    return responseBuilder.getResponse();
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    const { responseBuilder } = handlerInput;
    const speechText = 'Sorry, I didnt quite get that. Please say again';
    console.log(`Error handled: ${error.message}`);
    return responseBuilder.speak(speechText).reprompt(speechText).getResponse();
  },
};

// contains helper functions to build a CustomSkill with dynamoDB configuration
const skillBuilder = Alexa.SkillBuilders.standard();

exports.handler = skillBuilder
  .addRequestHandlers(
    LaunchRequestHandler,
    SessionEndedRequestHandler,
    HelpIntentHandler,
    YesIntent,
    NoIntent,
    AddUserIntentHandler,
    GetTopScoresIntentHandler,
    CancelAndStopIntentHandler
  )
  .addRequestInterceptors(LocalizationInterceptor)
  .addErrorHandlers(ErrorHandler)
  .withTableName(dynamoDBTableName)
  .withAutoCreateTable(true)
  .lambda();
