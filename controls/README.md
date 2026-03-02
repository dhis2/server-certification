The yml file is the normative source of the controls description.  This is the file that should be edited when authoring controls

To convert this file to different formats refer to the Makefile in the source directory.  The yq utility needs to be installed as 
well as the mustache templating language for rendering html.

`make json` will create a json version

The resulting json file is expected to conform to the [schema](controls.schema.json)

`make html` will create a human readable version

All generated files will be created in the `generated/` folder.

`make clean` will clean up all the files in `generated/` folder

