var React = require('react');

module.exports = React.createClass({
	render: function() {
		return (
			<div className="ShareButtons">
				<a className="social-action social-action-twitter" target="_blank"
					href={
						'https://twitter.com/intent/tweet' +
						'?text=' + encodeURIComponent('I ♥️ Logos!') +
						'&url=' + encodeURIComponent(process.env.npm_package_homepage) +
						'&via=Instant_Logos' +
						'&related=koggco' + encodeURIComponent(',Makers of @Instant_Logos') +
							',hovercards' + encodeURIComponent(',From the Makers of @Instant_Logos')
					}
					onClick={function() {
						ga('send', 'social', 'Twitter', 'Share', process.env.npm_package_homepage);
					}}>tweet</a>
				<a className="social-action social-action-facebook" target="_blank"
					href={'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(process.env.npm_package_homepage)}
					onClick={function() {
						ga('send', 'social', 'Facebook', 'Share', process.env.npm_package_homepage);
					}}>share</a>
				<a className="social-action social-action-github">star</a>
			</div>
		);
	}
});
