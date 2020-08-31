const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB();
const docClient = new AWS.DynamoDB.DocumentClient();
const tableName = 'GameScores';
const gameTitle = 'Dice Roller';

// Add user firstName, userID, and score to DynamoDB
const dbAddUserScore = (firstName, userID, score) => {
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
        return reject('Unable to insert user score');
      }
      resolve(data);
    });
  });
};

// Query the top 10 users from the leaderboard
const dbGetTopScores = () => {
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
      if (err) {
        console.error(
          'Unable to read item. Error JSON:',
          JSON.stringify(err, null, 2)
        );
        return reject(JSON.stringify(err, null, 2));
      }
      resolve(data.Items);
    });
  });
};

module.exports = { dbAddUserScore, dbGetTopScores };
