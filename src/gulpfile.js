var gulp = require('gulp');
var bs = require('browser-sync').create();

var _cssPattr = "css/*.css";
var _jsPattr = "controller/*.js";

gulp.task('default', function() {
  // place code for your default task here
  
});

gulp.task('css-watch', function(){
    return gulp.src(_cssPattr).pipe(bs.stream());    
});

gulp.task('browser-sync', function(){
  bs.init({
        server: {
            baseDir: "./"
        }
    });
    
    gulp.watch(_cssPattr, ['css-watch']);
    gulp.watch(_jsPattr).on("change", bs.reload);
    gulp.watch("*.html").on("change", bs.reload);
});

