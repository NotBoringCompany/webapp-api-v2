require('dotenv').config();
const Moralis = require('moralis-v1/node');
const { parseJSON } = require('../../utils/jsonParser');

/**
 * `getQuiz` returns a 25-question quiz with their data built initially for Realm Hunter's Discord Bot.
 * @return {Array} An array of quiz data objects.
 */
const getQuiz = async () => {
    try {
        const QuizData = new Moralis.Query('RealmHunterQuizBot');
        const quizData = await QuizData.find({ useMasterKey: true });

        if (quizData.length === 0 || !quizData) {
            throw new Error('No quiz data found');
        }

        const result = parseJSON(quizData);

        // an array of question data objects which include the question, answer(s) and other important data
        const questionDatas = [];

        result.forEach((questionItem) => {
            const questionData = {
                questionId: questionItem.questionId,
                question: questionItem.question,
                answers: questionItem.answers,
                correctAnswers: questionItem.correctAnswers,
                minimumPoints: questionItem.minimumPoints,
                maximumPoints: questionItem.maximumPoints,
                duration: questionItem.duration,
            };

            questionDatas.push(questionData);
        });

        return questionDatas;
    } catch (err) {
        throw err;
    }
};

getQuiz();

module.exports = { getQuiz };
