const gulp = require('gulp')
const del = require('del')
const gulpPug = require('gulp-pug')
const sass = require('gulp-sass')(require('sass')); // подключаем sass
const gulpPlumber = require('gulp-plumber') // позволяет серверу работать даже если есть ошибка в файлах
const gulpBabel = require('gulp-babel') // оптимизирует js код для старых браузеров
const gulpUglify = require('gulp-uglify') // добавляет минификацию js файлов
const gulpImagemin = require('gulp-imagemin') // уменьшаем размер изображений
const gulpAutoprefixer = require('gulp-autoprefixer') // добавляет префиксы для старых браузеров
const gulpCleanCss = require('gulp-clean-css') // добавляет минификацию css файлов
const gulpIf = require('gulp-if') // разбиваем сборку на dev и build
const svgSprite = require('gulp-svg-sprite') // пакеты для работы с svg файлами
const svgMin = require('gulp-svgmin') // пакеты для работы с svg файлами
const cheerio = require('gulp-cheerio') // пакеты для работы с svg файлами
const replace = require('gulp-replace') // пакеты для работы с svg файлами
const gulpConcat = require('gulp-concat') // объединяет стороние js файлы
const browserSync = require('browser-sync').create() // добавляет минификацию css файлов

let isBuildFlag = false;


function clean() {
    return del('dist');
}

function fonts() {
    return gulp.src('dev/static/fonts/**/*.*')
        .pipe(gulp.dest('dist/static/fonts'));
}

function pug2html() {
    return gulp.src('dev/pug/pages/*.pug')
        .pipe(gulpPlumber())
        .pipe(gulpPug({
            pretty: true
        }))
        .pipe(gulpPlumber.stop())
        .pipe(gulp.dest('dist'));
}

function scss2css() {
    return gulp.src('dev/static/styles/styles.scss')
        .pipe(gulpPlumber())
        .pipe(sass())
        .pipe(gulpAutoprefixer())
        .pipe(gulpIf(isBuildFlag, gulpCleanCss({level: 2})))
        .pipe(gulpPlumber.stop())
        .pipe(browserSync.stream())
        .pipe(gulp.dest('dist/static/css/'));
}

function script() {
    return gulp.src('dev/static/js/main.js')
        .pipe(gulpBabel({
            presets: ['@babel/env']
        }))
        .pipe(gulpIf(isBuildFlag, gulpUglify()))
        .pipe(browserSync.stream())
        .pipe(gulp.dest('dist/static/js/'));
}

function copyJquery() {
    return gulp.src('dev/static/js/vendors/jquery-3.6.0.min.js')
        .pipe(gulpConcat('libs.js'))
        .pipe(gulp.dest('dist/static/js/vendors/'));
}

function vendors() {
    return gulp.src(['node_modules/svg4everybody/dist/svg4everybody.min.js']) // через массив добавляем новые библиотеки js
        .pipe(gulpConcat('libs.js'))
        .pipe(gulp.dest('dist/static/js/vendors/'));
}

function imageMin() {
    return gulp.src(
        ['dev/static/images/**/*.{jpg,png,gif,svg}'],
        ['!dev/static/images/sprite/*'])
        .pipe(gulpIf(isBuildFlag, gulpImagemin([
            gulpImagemin.gifsicle({interlaced: true}),
            gulpImagemin.mozjpeg({quality: 75, progressive: true}),
            gulpImagemin.optipng({optimizationLevel: 5}),
            gulpImagemin.svgo({
                plugins: [
                    {removeViewBox: true},
                    {cleanupIDs: false}
                ]
            })
        ])))
        .pipe(gulp.dest('dist/static/images/'));
}

function svgSpriteBuild() {
    return gulp.src('dev/static/images/sprite/*.svg')
        .pipe(svgMin({
            js2svg: {
                pretty: true
            }
        }))
        .pipe(cheerio({
            run: function ($) {
                $('[fill]').removeAttr('fill');
                $('[stroke]').removeAttr('stroke');
                $('[style]').removeAttr('style');
            },
            parserOptions: {xmlMode: true}
        }))
        .pipe(replace('&gt;', '>'))
        .pipe(svgSprite({
            mode: {
                symbol: {
                    sprite: "sprite.svg"
                }
            }
        }))
        .pipe(gulp.dest('dist/static/images/sprite'));
}

function setMode(isBuild) {
    return cb=> {
        isBuildFlag = isBuild;
        cb();
    }
}

function watch() {
    browserSync.init({
        server: {
            baseDir:"dist"
        }
    });

    gulp.watch("dev/pug/**/*.pug", pug2html);
    gulp.watch("dev/static/styles/**/*.scss", scss2css);
    gulp.watch("[dev/static/images/**/*.{jpg,png,gif,svg},!dev/static/images/sprite/*]", imageMin);
    gulp.watch("dev/static/images/sprite/*", svgSpriteBuild);
    gulp.watch("dev/static/js/main.js", script);
    gulp.watch("dist/*.html").on('change', browserSync.reload);
}

const dev = gulp.parallel(fonts, pug2html, scss2css, imageMin, svgSpriteBuild, script, vendors)

exports.default = gulp.series(clean, dev, watch);
exports.build = gulp.series(clean, setMode(true), dev);
