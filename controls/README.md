The yml file is the normative source of the controls description.  This the file that should be edited when authoring controls

The yml can be converted to json using the yq program (`apt install yq` on debian/ubuntu)


```
yq -Y dhis2-certification-v1.yml > dhis2-certification-v1.json
```

The resulting json file is expected to conform to the [schema](controls.schema.json)

