var plugins = [
	'postcss-import',
	'postcss-nested',
	'postcss-custom-media',
	'autoprefixer',
	'postcss-color-rgba-fallback',
	'postcss-url',
	'postcss-cachebuster'
];

if (process.env.NODE_ENV === 'production') {
	plugins.push('cssnano');
}

module.exports = {
	'use':            plugins,
	'cssnano':        { autoprefixer: false },
	'postcss-import': { glob: true },
	'postcss-url':    { url:        'inline',
	                    fallback:   'copy',
	                    assetsPath: 'assets' }
};
