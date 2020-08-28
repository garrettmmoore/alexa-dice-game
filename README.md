# Ultimate Dice Roller

Play a dice roll game with Alexa!

## Play

- To start the game say "Open Ultimate Dice Roller"
- When Alexa, asks if you want to roll the dice say "Yes"
- If you want to upload your high score, say "add {firstName}"
- If you want to view the top scores, say "get top scores"
- To end the game, say "bye"

## Functionality

- User can roll a virtual dice
- User continues to roll the dice while increasing their total score
- Total score is persisted throughout the session
- User has the option to upload their high score to DynamoDB
- User can query the top 10 high scores

## DynamoDB Approach

- One `GameScore` Table
- Primary Partition Key is `UserId` (String). This ID is a unique Alexa Skills generated ID.
- Primary Sort Key is `GameTitle` (String).
- `TopScore` (Number) Attribute.
- `FirstName` (String) Attribute.

- Global Secondary Index - `GameTitleIndex`
- Secondary Partition Key is `GameTitle`
- Secondary Sort Key is `TopScore`

- My thought process behind this approach is that I needed a way to easily and effectively obtain the top 10 scores.
- Having a global secondary index allowed me to query the GameTitle and then the results would be sorted by the TopScore sort key.
- A handy tip I discovered is that by setting `ScanIndexForward` to false in the query, the results would be returned in descending order.

## Run Locally

```
npm install
```

```
npm run build
```

## Required

- Create an Alexa Skills Developer account
- Create an AWS account
- Install and configure the AWS-CLI
- Add the Lambda Arn to your `package.json` deploy script in order to deploy
