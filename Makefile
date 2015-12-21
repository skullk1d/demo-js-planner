.PHONY: bundle build js css

js:
	@mkdir -p build
	@cat lib/*\.js > build/libs.js
	@browserify -d index.js -t [ babelify minifyify ] > build/build.js
	@echo built js

css:
	@cat css/*\.css css/*\.less > build/build.less
	@lessc --clean-css build/build.less build/build.css
	@rm build/build.less
	@echo built css

# production with source maps (browserify and minifyify are global packages)
build: js css
	@echo browserified, babelified, minifyified

# staging (no minification)
bundle:
	@cat lib/*\.js > build/libs.js
	@browserify -d index.js -t [ babelify ] > build/build.js
	@echo built js

	@cat css/*\.css css/*\.less > build/build.less
	@lessc build/build.less build/build.css
	@rm build/build.less
	@echo built css