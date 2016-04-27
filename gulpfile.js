var gulp = require('gulp');
var config = require('./gulp.config.json');

var concat = require('gulp-concat');
var rename = require('gulp-rename');

var uglify = require('gulp-uglify');
var htmlmin = require('gulp-htmlmin');
var sass = require('gulp-sass');
var cssmin = require('gulp-clean-css');

var webpack = require('gulp-webpack');
var html2js = require('gulp-ng-html2js');
var annotate = require('gulp-ng-annotate');


gulp.task("index", function () {
    gulp.src(config.app.index, {
        base : "src"
    }).pipe(gulp.dest('dist'));
});

gulp.task("images", function () {
    gulp.src(config.app.images, {
        base : "src"
    }).pipe(gulp.dest('dist'));
});

gulp.task("libraries", function () {
    gulp.src(config.app.libraries, {
        base : "src"
    }).pipe(gulp.dest('dist'));
});

gulp.task("styles", function () {
    gulp.src(config.app.styles)
        .pipe(sass.sync())
        .pipe(cssmin())
        .pipe(rename("main.min.css"))
        .pipe(gulp.dest('dist'));
});

gulp.task("templates", function () {
    gulp.src(config.app.templates)
        .pipe(htmlmin({
            collapseWhitespace : true,
            minifyCSS : true,
            minifyJS : true
        }))
        .pipe(html2js({
            moduleName: "templates-html"
        }))
        .pipe(concat("templates.min.js"))
        .pipe(uglify())
        .pipe(gulp.dest("dist"));
});

gulp.task("pack", function () {
    gulp.src(config.app.js)
        .pipe(webpack({
            resolve: {
                alias: {
                    app: __dirname + "/src/app/app.js"
                }
            },
            module: {
                loaders: [
                    {
                        test: /\.js$/,
                        exclude: /(node_modules)/,
                        loader: 'babel',
                        query: {
                            presets: ['es2015']
                        }
                    }
                ]
            },
            output: {
                filename: 'app.js'
            }
        }))
        .pipe(annotate())
        .pipe(gulp.dest('dist'))
        .pipe(uglify())
        .pipe(rename("app.min.js"))
        .pipe(gulp.dest('dist'));
});

gulp.task("build", ["styles", "templates", "pack"]);

gulp.task("default", ["index", "images", "libraries", "build"]);

gulp.task("watch", ["default"], function () {
    gulp.watch(config.app.js, ["pack"]);
    gulp.watch(config.app.templates, ["templates"]);
    gulp.watch(config.app.styles, ["styles"]);
    gulp.watch(config.app.images, ["images"]);
    gulp.watch(config.app.index, ["index"]);
    gulp.watch(config.app.libraries, ["libraries"]);
});