/*sources:
	https://jsfiddle.net/wamosjk/ufhp9s15/
	https://www.w3schools.com/howto/tryit.asp?filename=tryhow_css_smooth_scroll_jquery
*/

$(document).ready(function(){

	$("#buttonhome").click(function(){
		if (this.hash !== "") {
		event.preventDefault();
		var hash = this.hash;
	
		$('html, body').animate({
			scrollTop: $(hash).offset().top
		}, 700, function(){
			window.location.hash = hash;
		});
		} 
	});

	$(window).scroll(function(){
		$('.homeheader').toggleClass('scrolled', $(this).scrollTop() > 5);
		$('.homenavlink').toggleClass('scrolled', $(this).scrollTop() > 5);

	});
	
});