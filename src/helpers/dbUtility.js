var AWS = require('aws-sdk');
AWS.config.update({ region: 'us-east-1' });
var dbUtility = function () {};
var dynamodb = new AWS.DynamoDB();
var docClient = new AWS.DynamoDB.DocumentClient();
const tableName = 'GameScores';
const gameTitle = 'Dice Roller';

dbUtility.prototype.addUserScore = (firstName, userID, score) => {
  return new Promise((resolve, reject) => {
    const params = {
      TableName: tableName,
      Item: {
        UserId: userID,
        TopScore: score,
        FirstName: firstName,
        GameTitle: gameTitle,
      },
    };
    docClient.put(params, (err, data) => {
      if (err) {
        console.log('Unable to insert (addUserScore)=>', JSON.stringify(err));
        return reject('Unable to insert');
      }
      console.log('AddUserScore succeeded!, ', JSON.stringify(data));
      resolve(data);
    });
  });
};
