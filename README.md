# Welcome to the Mobile Secure Browser (MSB) Project for ChromeOS
The Mobile Secure Browser for ChromeOS ensures a common, secure online testing experience by preventing users from switching to other applications and from performing certain hardware actions such as taking screenshots.

## License ##
This project is licensed under the [AIR Open Source License v1.0](http://www.smarterapp.org/documents/American_Institutes_for_Research_Open_Source_Software_License.pdf).

## Getting Involved ##
We would be happy to receive feedback on its capabilities, problems, or future enhancements:

* For general questions or discussions, please use the [Forum](http://forum.opentestsystem.org/viewforum.php?f=17).
* Feel free to **Fork** this project and develop your changes!

### Build Instructions
* In main.js, line 262 needs to be modified to set the defaultURL to something meaningful (or whatever the launch url needs to be)
* The manifest.json should be edited to change the app name and version
* Build is simply zipping up the AIRSecureTest folder.