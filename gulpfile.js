'use strict';

const gulp = require('gulp');
const babel  = require('gulp-babel');
const eslint = require('gulp-eslint');

const paths = ['src/**/*.js'];

gulp.task('default', ['build']);

gulp.task('watch', ['build'], () => {
  gulp.watch(paths, ['build']);
});

gulp.task('build', ['babel']);

gulp.task('lint', () => {
  gulp.src(paths)
  .pipe(eslint())
  .pipe(eslint.format())
  .pipe(eslint.failAfterError());
});

// gulp.task('sass', () =>
//   gulp.src('./public/css/**/*.scss')
//     .pipe(sass({ outputStyle: 'compressed' }).on('error', sass.logError))
//     .pipe(gulp.dest('./public/css')));

// gulp.task('sass:watch', () => {
//   gulp.watch('./public/css/**/*.scss', ['sass']);
// });

gulp.task('babel', () => {
  gulp.src(paths)
  .pipe(babel())
  .pipe(gulp.dest('build'));
});
