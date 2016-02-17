var _                        = require('underscore');
var classNames               = require('classnames');
var connect                  = require('react-redux').connect;
var createSelector           = require('reselect').createSelector;
var createStructuredSelector = require('reselect').createStructuredSelector;
var error                    = require('debug')(process.env.npm_package_name + ':application:error');
var saveAs                   = process.browser && require('filesaverjs').saveAs;
var JSZip                    = require('jszip');
var React                    = require('react');

var actions = require('../../actions');
var Popup   = require('../Popup');

module.exports = connect(createStructuredSelector({
	logos: createSelector(
		createSelector(
			_.property('logos'),
			createSelector(_.property('collection'), _.keys),
			function(logos, collectionAsArray) {
				return _.chain(collectionAsArray)
					.map(_.propertyOf(logos))
					.pluck('data')
					.reverse()
					.value();
			}
		),
		_.property('logos'),
		_.property('considering'),
		function(logos, originalLogos, considering) {
			if (_.isEmpty(considering)) {
				return logos;
			}
			var index = _.findIndex(logos, _.matcher({ id: considering }));
			if (index === -1) {
				return _.union([_.defaults({ considering: 'addition' }, originalLogos[considering].data)], logos);
			}
			logos = _.clone(logos);
			logos[index] = _.defaults({ considering: 'removal' }, logos[index]);
			return logos;
		}
	),
	considering: _.property('considering')
}))(React.createClass({
	getInitialState: _.constant({ popup: false }),
	render:          function() {
		return (
			<div className={classNames({
				collection:             true,
				collection_empty:       _.isEmpty(this.props.logos),
				collection_untouchable: this.props.considering
			})}>
				{this.state.popup && <Popup onClose={function() {
					this.setState({ popup: false });
				}.bind(this)} />}
				<ul className="collection__logos">
					{this.props.logos.map(function(logo) {
						return (
							<li key={logo.id} className={classNames({
								collection__logo:                      true,
								collection__logo_considering_addition: logo.considering === 'addition',
								collection__logo_considering_removal:  logo.considering === 'removal'
							})}>
								<img src={logo.svg} alt={logo.name + ' (' + logo.id + ')'} />
								<div className="collection__delete-logo"
									onClick={function(e) {
										e.preventDefault();
										this.uncollectLogo(logo);
									}.bind(this)}></div>
							</li>
						);
					}.bind(this))}
				</ul>
				{Boolean(this.props.logos.length) && ((this.props.logos.length > 1) ?
					(
						<div className="collection__ctas">
							<a href="" download onClick={function(e) {
								e.preventDefault();
								this.downloadAndZip(this.props.logos, 'svg').then(_.partial(this.downloadedLogos, this.props.logos, 'svg'));
							}.bind(this)}>Download SVGs</a>
							<a href="" download onClick={function(e) {
								e.preventDefault();
								this.downloadAndZip(this.props.logos, 'png').then(_.partial(this.downloadedLogos, this.props.logos, 'png'));
							}.bind(this)}>Download PNGs</a>
						</div>
					) : (
						<div className="collection__ctas">
							<a href={this.props.logos[0].svg} download={this.props.logos[0].id + '.svg'} onClick={_.partial(this.downloadedLogos, [this.props.logos[0]], 'svg')}>Download SVG</a>
							<a href={this.props.logos[0].png} download={this.props.logos[0].id + '.png'} onClick={_.partial(this.downloadedLogos, [this.props.logos[0]], 'png')}>Download PNG</a>
						</div>
					))
				}
			</div>
		);
	},
	downloadAndZip: function(logos, filetype) {
		var zip = new JSZip();

		var promise = Promise.all(
			_.chain(logos)
				.map(function(logo) {
					if (!filetype) {
						return Promise.reject(new Error('No Logo type was provided'));
					}
					if (!logo[filetype]) {
						return Promise.reject(new Error('Logo ' + logo.id + ' does not have a ' + filetype));
					}
					return Promise.resolve(logo[filetype]);
				})
				.map(function(promise, i) {
					return promise
						.then(fetch)
						.then(function(response) {
							if (response.status < 200 || response.status >= 300) {
								var error = new Error(response.statusText);
								error.response = response;
								throw error;
							}
							return response.arrayBuffer();
						})
						.then(function(data) {
							zip.file(logos[i].id + '.' + filetype, data);
						});
				})
				.value()
		).then(function() {
			saveAs(zip.generate({ type: 'blob' }), 'logos.zip');
			this.setState({ popup: true });
		}.bind(this));

		promise.catch(function(err) {
			error(err);
			ga('send', 'exception', { exDescription: err.message, exFatal: true });
		});

		return promise;
	},
	downloadedLogos: function(logos, filetype) {
		_.each(logos, function(logo) {
			ga(
				'ec:addProduct',
				_.chain(logo)
					.pick('id', 'name')
					.extend({ variant: filetype, quantity: 1 })
					.value()
			);
		});
		ga('ec:setAction', 'purchase', { id: _.times(20, _.partial(_.sample, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-.=+/@#$%^&*_', null)).join('') });
		ga('send', 'event', 'Collection', 'Download ' + filetype.toUpperCase(), null, logos.length);
		this.props.dispatch(actions.clearCollection());
	},
	uncollectLogo: function(logo) {
		ga(
			'ec:addProduct',
			_.chain(logo)
				.pick('id', 'name')
				.extend({ quantity: 1 })
				.value()
		);
		ga('ec:setAction', 'remove');
		ga('send', 'event', 'Collection', 'Remove from Collection', logo.id);
		this.props.dispatch(actions.removeFromCollection(logo));
	}
}));
