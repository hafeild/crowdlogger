
jQuery(document).ready(init);

function init(){
    jQuery(window).bind( 'message', add_src );
    add_listeners();
    update_page();
}


function add_src(e) {
    console.log('addSrc called!!');
    jQuery('#contents').html(e.originalEvent.data);

    // Pretty print any code.
    prettyPrint();

    var hash_parts = split_hash();
    // Scroll to the anchor if one exists.
    if( hash_parts.length > 1 ){
        console.log('scrolling to anchor: '+ hash_parts[1]);
        jQuery('a[name="'+ hash_parts[1] +'"]')[0].scrollIntoView();
    } else {
        window.scrollTo(0,0);
    }

    jQuery('body').on('click', '.top-tag', function(){
        console.log('clicked!');
        window.scrollTo(0,0);
        return false;
    });

    expand_menu(hash_parts[0]);
}

function expand_menu(name) {
    var menu_item = jQuery('.menu').find('a[href="#'+ name +'"]').parent();
    menu_item.children('.expanded').show();
    menu_item.children('.collapsed').hide();
}

function load_page(url) {
    jQuery('#tmp-contents').attr('src', url)
}

function add_listeners(){
    window.onhashchange = update_page;
    jQuery('.trigger').click(toggle_triggers);
}

function update_page() {
    console.log("hash changed to:"+ window.location.hash);
    var hash_parts = split_hash();
    if( hash_parts.length == 0 ){ 
        hash_parts.push("home"); 
    }

    var page = hash_parts[0];
    console.log('Loading '+ page);
    load_page(page +'.html');
}

function toggle_triggers(e){
    console.log('Toggling...');
    jQuery(this).parent().children('.toggle').toggle();
    // .each(function(i,elm2){
    //     jQuery(elm2).toggle();
    // });
    
}

function split_hash(){
    return window.location.hash ? 
        window.location.hash.replace(/^#/,'').split(':') : [];
}