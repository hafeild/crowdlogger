# Introduction #

Below is a list of the features that we'd like to add to CrowdLogger in the future or are currently working on.

# Key #
  * <font color='red'>Red = pending</font>
  * <font color='green'>Green = implemented</font>
  * <font color='orange'>Orange = in progress</font>

# Features #

## Interface ##
  * <font color='green'>More unified 'status page'</font>
  * <font color='green'>Entry-level deletion</font>
  * <font color='green'>Apps, like search task assistant (<a href='http://ciir-publications.cs.umass.edu/pub/web/getpdf.php?id=1069'>paper</a>, <a href='http://ciir.cs.umass.edu/~hfeild/publications/feild-2012-poster.pdf'>poster</a>)</font>
  * <font color='green'>Interactive experiments (have users label data)</font>
  * <font color='green'>New icons for toolbar: "CL" + pause/play and notification badges</font>

## Databases ##
  * <font color='green'>IndexedDB for both Firefox <del>(currently using text files)</del> and Chrome <del>(currently using !WebSQL)</del></font>
  * <font color='green'>JSON format for logs <del>(currently using tab-delimited strings)</del></font>

## CrowdLogger Remote Module (CLRM) API ##
  * Access to
    * user data<font color='green'>
<ul><li>search/browsing history<br>
</li><li>real-time browser interactions<br>
</li><li>CLRM storage</font>
</li></ul>    * global data
      * <font color='orange'>data collected across many users</font>
    * UI element
      * <font color='red'>CrowdLogger widgets</font>
      * <font color='green'>windows</font>
      * <strike>dialog tabs</strike>
      * <font color='green'>injected scripts</font>
    * privacy and anonymization<font color='green'>
<ul><li>encryption<br>
</li><li>secret sharing<br>
</li><li>anonymized uploading</font>
</li></ul>    * server-side access<font color='green'>
<ul><li>data<br>
</li><li>computations</font>
</li></ul>  * <font color='orange'>Documentation</font>

## Browser support ##
  * <font color='green'>Firefox 16+ support</font>
  * <font color='green'>Firefox restartless updates </font>
    * <font color='orange'>prompt user on uninstall</font>
  * <font color='green'>Update to Chrome manifest v2</font>
  * <font color='red'>Support additional browsers</font>