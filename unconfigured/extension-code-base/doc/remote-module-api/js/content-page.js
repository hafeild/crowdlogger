jQuery(document).ready(function(){
    console.log('Calling parent.postMessage...');
    parent.postMessage( document.body.innerHTML +"", '*' );
});