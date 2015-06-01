var gulp = require('gulp');
var browserSync = require('browser-sync').create();

var _cssPattr = "css/*.css";
var _jsPattr = "controller/*.js";

gulp.task('default', function() {
  // place code for your default task here
  
});

gulp.task('css-watch', function(){
    return gulp.src(_cssPattr).pipe(browserSync.stream());    
});

gulp.task('browser-sync', function(){
  browserSync.init({
        server: {
            baseDir: "./"
        }
    });
    
    browserSync.notify('Teste');
    
    gulp.watch(_cssPattr, ['css-watch']);
    gulp.watch(_jsPattr).on("change", browserSync.reload);
    gulp.watch("*.html").on("change", browserSync.reload);
});

