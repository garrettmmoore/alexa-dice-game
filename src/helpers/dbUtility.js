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

dbUtility.prototype.getTopScores = () => {
  return new Promise((resolve, reject) => {
    const params = {
      TableName: 'GameScores',
      IndexName: 'GameTitleIndex',
      KeyConditionExpression: 'GameTitle = :v_title',
      ExpressionAttributeValues: {
        ':v_title': { S: gameTitle },
      },
      ProjectionExpression: 'UserId, TopScore',
      ScanIndexForward: false,
    };

    dynamodb.query(params, (err, data) => {
      console.log('getTopScores data', data);
      if (err) {
        console.error(
          'Unable to read item. Error JSON:',
          JSON.stringify(err, null, 2)
        );
        return reject(JSON.stringify(err, null, 2));
      }
      console.log('GetTopScores succeeded:', JSON.stringify(data, null, 2));
      resolve(data.Items);
    });
  });
};

module.exports = new dbUtility();
