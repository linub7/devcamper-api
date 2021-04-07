const Joi = require('joi');
const express = require('express');
const app = express();

app.use(express.json());

const courses = [
    { id: 1, name: 'course1' },
    { id: 2, name: 'course2' },
    { id: 3, name: 'course3' },
];

app.get('/', (req, res, next) => {
    res.send("Hello WoRlD");
});

app.get('/api/courses', (req, res, next) => {
    res.send(courses);
});

app.post('/api/courses', (req, res, next) => {
    const schema = Joi.object({
        name: Joi.string().min(5).required()
    })
    const { error, value } = schema.validate(req.body);
    // console.log(error);
    if (error) {
        res.status(400).send('Bad Request');
        return;
    }


    const course = {
        id: courses.length + 1,
        name: req.body.name
    };
    courses.push(course);

    res.send(course);
});

app.get('/api/course/:courseId', (req, res, next) => {
    const course = courses.find(c => c.id == parseInt(req.params.courseId));
    if (!course) {
        res.status(400).send("Course Not Found");
    }
    res.send(course);
});

app.put('/api/courses/:courseId', (req, res, next) => {
    const course = courses.find(c => c.id == req.params.courseId);
    if (!course) {
        res.status(400).send("Course not Found");
    }

    const schema = Joi.object({
        name: Joi.string().min(3).required()
    });
    const { error, value } = schema.validate(req.body);
    if (error) {
        return res.status(400).send(error);
    }

    course.name = req.body.name;
    res.status(200).send(course);


});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`App listening on port ${port}!`);
});