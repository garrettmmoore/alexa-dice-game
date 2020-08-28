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

const GetTopScoresIntentHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name === 'GetTopScoresIntent'
    );
  },
  async handle(handlerInput) {
    const { responseBuilder } = handlerInput;

    return dbUtility
      .getTopScores()
      .then((data) => {
        let speechText = 'The top ten scores are ';
        if (data.length == 0) {
          speechText =
            'Sorry, there are no top scores yet. Play to be the first!';
        } else {
          const scores = [];
          data.map((e) => {
            const topScore = e['TopScore']['N'];
            scores.push(`${topScore}`);
          });

          speechText += scores.join(', ');
        }
        return responseBuilder
          .speak(speechText)
          .reprompt('Would you like to see the high scores again?')
          .getResponse();
      })
      .catch((err) => {
        const speechText = 'Unable to get the top scores. Please try again.';
        return responseBuilder.speak(speechText).getResponse();
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
    const speechText = 'Would you like to start a game?';

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .getResponse();
  },
};

const CancelAndStopIntentHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      (handlerInput.requestEnvelope.request.intent.name ===
        'AMAZON.CancelIntent' ||
        handlerInput.requestEnvelope.request.intent.name ===
          'AMAZON.StopIntent')
    );
  },
  handle(handlerInput) {
    const speechText = 'See you later Alligator!';

    return handlerInput.responseBuilder.speak(speechText).getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
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

    return handlerInput.responseBuilder
      .speak("Sorry, I didn't quite get that. Please say again.")
      .reprompt("Sorry, I didn't quite get that. Please say again.")
      .getResponse();
  },
};

const skillBuilder = Alexa.SkillBuilders.standard();

exports.handler = skillBuilder
  .addRequestHandlers(
    LaunchRequestHandler,
    YesIntent,
    NoIntent,
    AddUserIntentHandler,
    GetTopScoresIntentHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler
  )
  .addErrorHandlers(ErrorHandler)
  .withTableName(dynamoDBTableName)
  .withAutoCreateTable(true)
  .lambda();
