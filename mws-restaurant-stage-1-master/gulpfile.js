const gulp = require('gulp');
const babelify = require('babelify');
const browserify = require('browserify');
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');
const uglify = require('gulp-uglify');
const sourcemaps = require('gulp-sourcemaps');
const browserSync = require('browser-sync').create();
const image = require('gulp-image');
const htmlmin = require('gulp-htmlmin');

gulp.task('js-dev:main', () => {
    browserify(['js-dev/dbhelper.js', 'js-dev/main.js'])
        .transform(babelify.configure({
            presets: ['env']
        }))
        .bundle()
        .pipe(source('main_bundle.js'))
        .pipe(buffer())
        .pipe(sourcemaps.init())
        .pipe(uglify())
        .pipe(sourcemaps.write('maps'))
        .pipe(gulp.dest('./js'));
});

gulp.task('js-dev:restaurant', () => {
    browserify(['js-dev/dbhelper.js', 'js-dev/restaurant_info.js'])
        .transform(babelify.configure({
            presets: ['env']
        }))
        .bundle()
        .pipe(source('restaurant_info_bundle.js'))
        .pipe(buffer())
        .pipe(sourcemaps.init())
        .pipe(uglify())
        .pipe(sourcemaps.write('maps'))
        .pipe(gulp.dest('./js'));
});

gulp.task('watch', () => {
    gulp.watch(['./sw.js', './js-dev/**/*.js'], ['js-dev:main', 'js-dev:restaurant']);
});

gulp.task('default', ['js-dev:main', 'js-dev:restaurant', 'watch']);