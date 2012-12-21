

jQuery(document).ready(init);
var page;

function init(){
    
    load_page('test.html');

}


function load_page(url) {
    jQuery('#contents').attr('src', 'test.html')
    //.height(
    //    parseInt(jQuery('#contents')[0].contentWindow.document.html.height)+20 );
    page = jQuery(jQuery('#contents')[0].contentWindow.document);
    console.log(page);
    jQuery('#contents').outerHeight();
    //console.log(jQuery('#contents')[0]);
}