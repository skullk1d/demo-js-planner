.PHONY: bundle build

# production with source maps (browserify and minifyify are global packages)
build:
	@browserify -d index.js -t [ babelify minifyify ] > build/build.js
	@cat css/*\.css css/*\.less > build/build.less
	@lessc --clean-css build/build.less build/build.css
	@rm build/build.less
	@echo browserified, babelified, minifyified