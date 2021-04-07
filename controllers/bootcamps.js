const path = require('path');
const Bootcamp = require('../models/Bootcamp');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const geocoder = require('../utils/geocoder');

// @desc    GET all bootcamps
// @route   GET /api/v1/bootcamps
// @access  Public
exports.getBootcamps = asyncHandler(async (req, res, next) => {
    res.status(200).json(res.advancedResults);
});

// @desc    GET single bootcamp
// @route   GET /api/v1/bootcamps/:id
// @access  Public
exports.getBootcamp = asyncHandler(async (req, res, next) => {
    const id = req.params.id;
    const bootcamp = await Bootcamp.findById(id);

    if (!bootcamp) {
        return next(
            new ErrorResponse(`Bootcamp not found with id ${req.params.id}`, 404)
        );
    }

    res.status(200).json({
        success: true,
        data: bootcamp,
    });
});

// @desc    Crete new bootcamp
// @route   POST /api/v1/bootcamps
// @access  Private
exports.createBootcamp = asyncHandler(async (req, res, next) => {
    // Add user to req.body
    req.body.user = req.user.id;

    // Check for published bootcamp
    const publishedBootcamp = await Bootcamp.findOne({
        user: req.user.id,
    });

    // If the user is not an admin, they can only add one bootcamp
    if (publishedBootcamp && req.user.role !== 'admin') {
        return next(
            new ErrorResponse(
                `The User with ID ${req.user.id} has already published a bootcamp`,
                400
            )
        );
    }

    const bootcamp = await Bootcamp.create(req.body);

    res.status(201).json({
        success: true,
        data: bootcamp,
    });
});

// @desc    Update bootcamp
// @route   PUT /api/v1/bootcamps/:id
// @access  Private
exports.updateBootcamp = asyncHandler(async (req, res, next) => {
    const id = req.params.id;
    let bootcamp = await Bootcamp.findById(id);

    if (!bootcamp) {
        return next(
            new ErrorResponse(`Bootcamp not found with id ${req.params.id}`, 404)
        );
    }

    // Make sure user is bootcamp ownership
    if (bootcamp.user.toString() !== req.user.id && req.user.role !== 'admin') {
        return next(
            new ErrorResponse(
                `User ${req.user.id} is not authorize to update this bootcamp`,
                401
            )
        );
    }

    bootcamp = await Bootcamp.findOneAndUpdate(id, req.body, {
        new: true,
        runValidators: true,
    });

    res.status(200).json({
        success: true,
        data: bootcamp,
    });
});

// @desc    Delete bootcamp
// @route   DELETE /api/v1/bootcamps/:id
// @access  Private
exports.deleteBootcamp = asyncHandler(async (req, res, next) => {
    const id = req.params.id;

    const bootcamp = await Bootcamp.findById(id);

    if (!bootcamp) {
        return next(
            new ErrorResponse(`Bootcamp not found with id ${req.params.id}`, 404)
        );
    }

    // Make sure user is bootcamp ownership
    if (bootcamp.user.toString() !== req.user.id && req.user.role !== 'admin') {
        return next(
            new ErrorResponse(
                `User ${req.user.id} is not authorize to delete this bootcamp`,
                401
            )
        );
    }

    bootcamp.remove();

    res.status(200).json({
        success: true,
        data: {},
    });
});
// @desc    Upload photo bootcamp
// @route   PUT /api/v1/bootcamps/:id/photo
// @access  Private
exports.bootcampPhotoUpload = asyncHandler(async (req, res, next) => {
    const id = req.params.id;

    const bootcamp = await Bootcamp.findById(id);

    if (!bootcamp) {
        return next(
            new ErrorResponse(`Bootcamp not found with id ${req.params.id}`, 404)
        );
    }

    // Make sure user is bootcamp ownership
    if (bootcamp.user.toString() !== req.user.id && req.user.role !== 'admin') {
        return next(
            new ErrorResponse(
                `User ${req.user.id} is not authorize to update photo this bootcamp`,
                401
            )
        );
    }

    if (!req.files) {
        return next(new ErrorResponse(`Please Upload a file`, 400));
    }

    const {
        file
    } = req.files;

    // Make sure that the image is a photo
    if (!file.mimetype.startsWith('image')) {
        return next(new ErrorResponse(`Please Upload an image file`, 400));
    }

    // Check filesize
    if (file.size > process.env.MAX_FILE_UPLOAD) {
        return next(
            new ErrorResponse(
                `Please Upload an image less than ${process.env.MAX_FILE_UPLOAD}`,
                400
            )
        );
    }

    // Create custom filename
    file.name = `photo_${bootcamp._id}${path.parse(file.name).ext}`;

    file.mv(`${process.env.FILE_UPLOAD_PATH}/${file.name}`, async (err) => {
        if (err) {
            console.log(err);
            return next(new ErrorResponse(`Problem with file upload`, 500));
        }

        await Bootcamp.findByIdAndUpdate(id, {
            photo: file.name,
        });

        res.status(200).json({
            success: true,
            data: file.name,
        });
    });

    console.log(file.name);
});

// @desc    Get bootcamps within radius
// @route   GET /api/v1/bootcamps/radius/:zipcode/:distance
// @access  Private
exports.getBootcampsInRadius = asyncHandler(async (req, res, next) => {
    const {
        zipcode,
        distance
    } = req.params;

    // Get lat/lng from geocoder
    const loc = await geocoder.geocode(zipcode);
    const lat = loc[0].latitude;
    const lng = loc[0].longitude;

    // Calc radius uaing radians
    // Divide dist by radius of earth
    // Earth Radius = 3,963 mi / 6,378 km
    const radius = distance / 3963;

    const bootcamps = await Bootcamp.find({
        location: {
            $geoWithin: {
                $centerSphere: [
                    [lng, lat], radius
                ],
            },
        },
    });

    res.status(200).json({
        success: true,
        count: bootcamps.length,
        data: bootcamps,
    });
});