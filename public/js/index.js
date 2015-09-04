if (document.body.createTextRange) { // ms
    $.fn.highlight = function(elem) {
        var range = document.body.createTextRange();
        range.moveToElementText((elem ? this.find(elem) : this).get(0));
        range.select();
        return this;
    };
} else if (window.getSelection) { // moz, opera, webkit
    $.fn.highlight = function(elem) {
        var selection = window.getSelection();
        var range = document.createRange();
        range.selectNodeContents((elem ? this.find(elem) : this).get(0));
        selection.removeAllRanges();
        selection.addRange(range);
        return this;
    };
} else {
    $.fn.highlight = function() {
        return this;
    };
}

$(function() {
    var $body             = $('body');
    var $fake_placeholder = $('#fake-placeholder');
    var $filter_style     = $('#filter-styles');
    var $popup            = $('#logo-popup');
    var $popup_container  = $('#logo-popup-container');
    var $search_bar       = $('#search-bar');

    var active    = $body.hasClass('one-result') && 'one-result';
    var searching = '';

    $search_bar.on('input', function(e) {
        searching = $search_bar.val().toLowerCase().replace(/[^a-z0-9]+/g, '');
        var filtering = !!searching.length;
        $body.toggleClass('filtering', filtering);
        $filter_style.text(filtering ? ('.trie-' + searching + '{display:block !important;}' + '.group-' + searching[0].replace(/[0-9]/, '0-9') + '{display:block !important;}') : '');
        if (!filtering) {
            $body.trigger('close');
            return;
        }
        var brands = $('.trie-' + searching);
        if (brands.length !== 1) {
            $body.trigger('close');
            return;
        }
        brands.first().trigger('load-content', ['one-result']);
    });
    $search_bar.select();

    $('#search-form').on('submit', function(e) {
        e.preventDefault();
        if (!searching || !searching.length) {
            return;
        }
        var brand_obj = $('.trie-' + searching + ':first');
        if (active && active !== 'popup') {
            $search_bar
                .val(brand_obj.data().brand.name)
                .trigger('input');
            return;
        }
        brand_obj.trigger('load-content', ['popup']);
    });

    $body.on('click', '.tile', function() {
        $(this).parent().trigger('load-content', ['popup']);
    });

    $body.on('click', '.select-on-click', function() {
        $(this).highlight('.color');
    });

    $body.on('mouseenter mouseleave', '.isolate-scrolling', function(e) {
        $body.toggleClass('prevent-scroll', e.type === 'mouseenter');
    });

    $popup_container.on('click', function(e) {
        if (active !== 'popup') {
            return;
        }
        var target = $(e.target);
        if ($popup.is(target) || $popup.has(target).length) {
            return;
        }
        $body.trigger('close');
    });

    $body.on('keydown', function(e) {
        if (active !== 'popup') {
            return;
        }
        if (e.which !== 27) {
            return;
        }
        $body.trigger('close');
    });

    $body.on('load-content', '.brand', function(e, class_name) {
        var brand;
        if (class_name === 'one-result') {
            brand = $(this).data().brand;
            $fake_placeholder.text($search_bar.val() + ((searching.length - brand.normalized_name.length) ? brand.normalized_name.substr(searching.length - brand.normalized_name.length) : ''));
            $fake_placeholder.html($fake_placeholder.text().replace(/ /g, '&nbsp;'));
        }
        if (active) {
            return;
        }
        active = class_name;
        $body.addClass(active);
        brand = $(this).data().brand;
        window.history.replaceState('', 'Instant Logo Search - ' + brand.name, '/' + brand.normalized_name);
        document.title = 'Instant Logo Search - ' + brand.name;

        $popup.detach();
        $popup.html(swig.run(popup_tmpl, { brand: brand }));
        $popup.appendTo($popup_container);
    });

    $body.on('close', function() {
        if (!active) {
            return;
        }
        $fake_placeholder.text('');
        window.history.replaceState('', 'Instant Logo Search', '/');
        document.title = 'Instant Logo Search';
        $body.removeClass(active);
        active = null;
    });
});
