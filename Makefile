all:  json html

json:  controls/dhis2-certification-v1.yml
	yq . controls/dhis2-certification-v1.yml > generated/dhis2-certification-v1.json

html: controls/dhis2-certification-v1.yml scripts/dscp.mustache
	yq . controls/dhis2-certification-v1.yml | mustache - scripts/dscp.mustache > generated/dhis2-certification-v1.html

clean:
	rm -f generated/*
	
.PHONY: assessment
assessment:
	mkdir -p $(NAME)_assessment
	cp controls/dhis2-certification-v1.yml $(NAME)_assessment/$(NAME)_assessment.yml
	yq . $(NAME)_assessment/$(NAME)_assessment.yml | mustache - scripts/dscp_assessment.mustache > $(NAME)_assessment/$(NAME)_assessment.html
