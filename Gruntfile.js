/*
OAS-tools module 0.0.0, built on: 2017-03-30
Copyright (C) 2017 Ignacio Peluaga Lozada (ISA Group)
https://github.com/ignpelloz
https://github.com/isa-group/project-oas-tools
*/

module.exports = (grunt) => {
  grunt.loadNpmTasks("grunt-contrib-jshint");
  grunt.loadNpmTasks("grunt-contrib-watch");
  grunt.loadNpmTasks("grunt-mocha-test");
  grunt.loadNpmTasks("grunt-release-github");
  grunt.loadNpmTasks("grunt-banner");
  grunt.loadNpmTasks("grunt-dockerize");
  grunt.loadNpmTasks("grunt-run");

  // Project configuration.
  grunt.initConfig({
    //Load configurations
    pkg: grunt.file.readJSON("package.json"),
    licenseNotice: grunt.file
      .read("extra/license-notice", {
        encoding: "utf8",
      })
      .toString(),
    latestReleaseNotes: grunt.file
      .read("extra/latest-release-notes", {
        encoding: "utf8",
      })
      .toString(),

    run: {
      npm_build: {
        cmd: "npm",
        args: ["run", "build"],
      },
    },

    //Add license notice and latest release notes
    usebanner: {
      license: {
        options: {
          position: "top",
          banner: "/*!\n<%= licenseNotice %>*/\n",
          replace: true,
        },
        files: {
          src: ["src/**/*.js", "tests/**/*.js", "Gruntfile.js"], //If you want to inspect more file, you change this.
        },
      },
      readme: {
        options: {
          position: "bottom",
          banner: "## Copyright notice\n\n<%= latestReleaseNotes %>",
          replace: /##\sCopyright\snotice(\s||.)+/g,
          linebreak: false,
        },
        files: {
          src: ["README.md"],
        },
      },
    },

    //Lint JS
    jshint: {
      all: ["Gruntfile.js", "src/**/*.js", "tests/**/*.js", "index.js"], //If you want to inspect more file, you change this.
      options: {
        jshintrc: ".jshintrc",
      },
    },

    //Execute mocha tests
    mochaTest: {
      tests: {
        options: {
          reporter: "spec",
          //captureFile: 'test.results<%= grunt.template.today("yyyy-mm-dd:HH:mm:ss") %>.txt', // Optionally capture the reporter output to a file
          quiet: false, // Optionally suppress output to standard out (defaults to false)
          clearRequireCache: false, // Optionally clear the require cache before running tests (defaults to false)
          noFail: false, // Optionally set to not fail on failed tests (will still fail on other errors)
        },
        src: ["tests/**/*.js"],
      },
    },

    //Make a new release on github
    //"grunt release" for pacth version
    //"grunt release:minior" for minior version
    //"grunt release:major" for major version
    release: {
      options: {
        changelog: true, //NOT CHANGE
        changelogFromGithub: true, //NOT CHANGE
        githubReleaseBody: "See [CHANGELOG.md](./CHANGELOG.md) for details.", //NOT CHANGE
        npm: true, //CHANGE TO TRUE IF YOUR PROJECT IS A NPM MODULE
        //npmtag: true, //default: no tag
        updateVars: ["pkg"], //NOT CHANGE
        github: {
          repo: "isa-group/project-oas-tools", //SET WITH YOUR PROJECT ID
          accessTokenVar: "GITHUB_ACCESS_TOKEN", //SET ENVIRONMENT VARIABLE WITH THIS NAME
          usernameVar: "GITHUB_USERNAME", //SET ENVIRONMENT VARIABLE WITH THIS NAME
        },
      },
    },

    //IT IS RECOMENDED TO EXECUTE "grunt watch" while you are working.
    watch: {
      scripts: {
        files: ["src/**/*.js"],
        tasks: ["jshint"],
      },
    },

    //USE THIS TASK FOR BUILDING AND PUSHING docker images
    dockerize: {
      "project-template-latest": {
        options: {
          auth: {
            email: "DOCKER_HUB_EMAIL", //SET ENVIRONMENT VARIABLE WITH THIS NAME
            username: "DOCKER_HUB_USERNAME", //SET ENVIRONMENT VARIABLE WITH THIS NAME
            password: "DOCKER_HUB_PASSWORD", //SET ENVIRONMENT VARIABLE WITH THIS NAME
          },
          name: "project-template",
          push: true,
        },
      },
      "project-template-version": {
        options: {
          auth: {
            email: "DOCKER_HUB_EMAIL", //SET ENVIRONMENT VARIABLE WITH THIS NAME
            username: "DOCKER_HUB_USERNAME", //SET ENVIRONMENT VARIABLE WITH THIS NAME
            password: "DOCKER_HUB_PASSWORD", //SET ENVIRONMENT VARIABLE WITH THIS NAME
          },
          name: "project-template",
          tag: "<%= pkg.version %>",
          push: true,
        },
      },
    },
  });

  grunt.registerTask("buildOn", () => {
    grunt.config("pkg.buildOn", grunt.template.today("yyyy-mm-dd"));
    grunt.file.write(
      "package.json",
      JSON.stringify(grunt.config("pkg"), null, 2)
    );
  });

  // Default task(s).
  grunt.registerTask("default", ["jshint", "usebanner"]);

  //TEST TASK
  grunt.registerTask("test", ["jshint", "mochaTest"]);

  //BUILD TASK
  grunt.registerTask("build", [
    "test",
    "buildOn",
    "usebanner",
    "run:npm_build",
    "dockerize",
  ]);

  //DEVELOPMENT TASK
  grunt.registerTask("dev", ["watch"]);
};
