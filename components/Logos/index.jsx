var _                        = require('underscore');
var classNames               = require('classnames');
var connect                  = require('react-redux').connect;
var createSelector           = require('reselect').createSelector;
var createStructuredSelector = require('reselect').createStructuredSelector;
var error                    = require('debug')(process.env.npm_package_name + ':application:error');
var History                  = require('react-router').History;
var React                    = require('react');

var actions = require('../../actions');

var PAGE_SIZE = 20;

module.exports = connect(createStructuredSelector({
	logos: createSelector(
		_.property('logos'),
		createSelector(
			_.property('searching'),
			function(searching) {
				return _.chain(searching.trim().split(/\s+/))
					.invoke('toLowerCase')
					.invoke('replace', /[.\- ]/gi, '')
					.compact()
					.value();
			}
		),
		function(logos, filters) {
			if (_.isEmpty(filters)) {
				return _.chain(logos)
					.sortBy(function(logo) {
						return -logo.data.downloads;
					})
					.pluck('data')
					.value();
			}
			return _.chain(logos)
				.map(function(logo) {
					var name = logo.data.name.toLowerCase().replace(/[.\- ]/gi, '');

					return _.defaults({
						pos: _.chain(filters)
							.map(function(filter) {
								return name.indexOf(filter, 0);
							})
							.min()
							.value()
					}, logo);
				})
				.reject(_.matcher({ pos: -1 }))
				.sortBy(function(logo) {
					return 1000 * logo.pos - logo.data.downloads;
				})
				.pluck('data')
				.value();
		}
	),
	collection:  _.property('collection'),
	considering: _.property('considering'),
	searching:   _.property('searching')
}))(React.createClass({
	mixins:                    [History],
	getInitialState:           _.constant({ pages: 1, infinite: false }),
	componentWillReceiveProps: function(nextProps) {
		if (_.isEqual(this.props.logos, nextProps.logos)) {
			return;
		}
		this.setState({ pages: 1, infinite: false });
	},
	render: function() {
		return (
			<div className={classNames({
				'logos':              true,
				'logos_extra-bottom': !_.isEmpty(this.props.collection)
			})}>
				<div className="logos-container">
					<div className="logos-title">
						<h3>{this.props.searching ? 'Search Results' : 'Popular Logos'}</h3>
					</div>
					<ul>
						{_.first(this.props.logos, this.state.pages * PAGE_SIZE).map(function(logo, i) {
							return (
								<li className={classNames({
									'brand-logo':             true,
									'brand-logo_collected':   this.props.collection[logo.id],
									'brand-logo_considering': _.isEmpty(this.props.collection) && (this.props.considering === logo.id)
								})} key={logo.id}>
									<div className="brand-logo-image flex-center">
										<img src={logo.svg} />
									</div>
									<div className="brand-logo-ctas">
										<strong>{logo.name}</strong>
										<div className="brand-logo-ctas-download">
											<a href={logo.svg} download={logo.id + '.svg'} onClick={_.partial(this.downloadedLogo, logo, i, 'svg')}>SVG</a>
											<a href={logo.png} download={logo.id + '.png'} onClick={_.partial(this.downloadedLogo, logo, i, 'png')}>PNG</a>
										</div>
										<a className="brand-logo-ctas-collection" href=""
											onClick={function(e) {
												e.preventDefault();
												this.toggleCollected(logo, i);
											}.bind(this)}
											onMouseMove={_.partial(this.toggleConsiderLogo, logo, true)}
											onMouseLeave={_.partial(this.toggleConsiderLogo, logo, false)}>
											{this.props.collection[logo.id] ? 'Remove from' : 'Add to'} Bucket
										</a>
									</div>
								</li>
							);
						}.bind(this))}
						<li className="brand-logo missing-logo">
							<div className="brand-logo-image"></div>
							<div className="pop-over">
								<div className="suggest">
									<form onSubmit={function(e) {
										e.preventDefault();
										this.suggestLogo(this.refs.suggest_name.value).then(function() {
											this.refs.suggest_name.value = '';
										}.bind(this));
									}.bind(this)}>
										<input type="text" ref="suggest_name" defaultValue={this.props.searching}/>
										<input type="file" ref="suggest_file" accept="image/" />
										<input type="submit" />
									</form>
								</div>
							</div>
							<div className="flex-center">
								<div className="">
									<span>Can't find quite what you're looking for? </span>
									<u>Suggest</u>
									<span> a logo or </span>
									<u>upload</u>
									<span> something yourself!</span>
								</div>
							</div>
						</li>
					</ul>
					{!this.state.infinite && ((this.state.pages * PAGE_SIZE) < this.props.logos.length) && (
						<div className="load-more">
							<a href="" className="load-more-cta" onClick={function(e) {
								e.preventDefault();
								this.loadMore('CTA');
							}.bind(this)}>Show More</a>
						</div>
					)}
				</div>
			</div>
		);
	},
	componentDidMount: function() {
		this.sendPageView();
	},
	componentDidUpdate: function(prevProps, prevState) {
		if (this.props.searching !== prevProps.searching) {
			this.updatePageView();
			if (this.refs.suggest_name) {
				this.refs.suggest_name.value = this.props.searching;
			}
		}
		if (this.state.infinite !== prevState.infinite) {
			if (this.state.infinite) {
				this.startInfiniteScroll();
			} else {
				this.stopInfiniteScroll();
			}
		}
	},
	componentWillUnmount: function() {
		clearTimeout(this.timeout);
	},
	downloadedLogo: function(logo, i, filetype) {
		ga(
			'ec:addProduct',
			_.chain(logo)
				.pick('id', 'name')
				.extend({ list: this.props.searching ? 'Search Results' : 'Popular Logos', position: i + 1, variant: filetype, quantity: 1 })
				.value()
		);
		ga('ec:setAction', 'purchase', { id: _.times(20, _.partial(_.sample, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-.=+/@#$%^&*_', null)).join('') });
		ga('send', 'event', 'Logos', 'Download ' + filetype.toUpperCase(), logo.id, 1);
	},
	loadMore: function(how) {
		_.chain(this.props.logos)
			.rest((this.state.pages + 1) * PAGE_SIZE)
			.first(PAGE_SIZE)
			.each(function(logo, i) {
				ga(
					'ec:addImpression',
					_.chain(logo)
						.pick('id', 'name')
						.extend({
							list:     this.props.searching ? 'Search Results' : 'Popular Logos',
							position: (this.state.pages + 1) * PAGE_SIZE + i + 1
						})
						.value()
				);
			}.bind(this));
		ga('send', 'event', 'Logos', 'Load More', how || null, (this.state.pages + 1) * PAGE_SIZE);
		this.setState({ pages: this.state.pages + 1, infinite: true });
	},
	sendPageView: function() {
		_.chain(this.props.logos)
			.first(this.state.pages * PAGE_SIZE)
			.each(function(logo, i) {
				ga(
					'ec:addImpression',
					_.chain(logo)
						.pick('id', 'name')
						.extend({ list: this.props.searching ? 'Search Results' : 'Popular Logos', position: i + 1 })
						.value()
				);
			}.bind(this));
		ga('send', 'pageview');
	},
	startInfiniteScroll: function() {
		var listener = _.throttle(function() {
			if (document.body.scrollTop + window.innerHeight + 20 < document.body.scrollHeight) {
				return;
			}
			this.loadMore('Infinite Scroll');
		}.bind(this), 500);
		window.addEventListener('scroll', listener);
		window.addEventListener('resize', listener);
		this.stopInfiniteScroll = function() {
			this.stopInfiniteScroll = _.noop;
			window.removeEventListener('scroll', listener);
			window.removeEventListener('resize', listener);
		};
	},
	stopInfiniteScroll: _.noop,
	suggestLogo:        function(name) {
		var promise = this.props.dispatch(actions.createSuggestion({ name: name }, {}));

		promise.catch(function(err) {
			error(err);
			ga('send', 'exception', { exDescription: err.message, exFatal: true });
		});

		return promise;
	},
	toggleCollected: function(logo, i) {
		ga(
			'ec:addProduct',
			_.chain(logo)
				.pick('id', 'name')
				.extend({ list: this.props.searching ? 'Search Results' : 'Popular Logos', position: i + 1, quantity: 1 })
				.value()
		);
		if (this.props.collection[logo.id]) {
			ga('ec:setAction', 'remove');
			ga('send', 'event', 'Logos', 'Remove from Collection', logo.id);
			this.props.dispatch(actions.removeFromCollection(logo));
		} else {
			ga('ec:setAction', 'add');
			ga('send', 'event', 'Logos', 'Add to Collection', logo.id);
			this.props.dispatch(actions.addToCollection(logo));
		}
		this.toggleConsiderLogo(logo, false);
	},
	toggleConsiderLogo: function(logo, consider) {
		if (consider && (this.props.considering === logo.id)) {
			return;
		}
		clearTimeout(this.timeout);
		this.timeout = setTimeout(_.partial(_.compose(this.props.dispatch, consider ? actions.considerLogo : actions.unconsiderLogo), logo), 50);
	},
	updatePageView: _.debounce(function() {
		if (this.props.searching) {
			ga('send', 'event', 'Search', 'Searching', this.props.searching);
		}
		// The searching "event" happens before we change the page
		// Plus, I'm not sure if the events flow bridges pageviews, so it makes more sense being part of the flow of the previous "page"
		this.history.replace(document.location.pathname + (this.props.searching ? '?q=' + this.props.searching : ''));
		ga('set', { location: document.location.href, title: document.title });
		this.sendPageView();
	}, 500)
}));
