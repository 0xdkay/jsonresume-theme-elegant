var fs = require('fs');
var jade = require('jade');
var _ = require('underscore');
var utils = require('jsonresume-themeutils');
var moment = require('moment');

require('./moment-precise-range.js');

utils.setConfig({
    date_format: 'MMM, YYYY'
});

function interpolate(object, keyPath) {
    var keys = keyPath.split('.');

    return _(keys).reduce(function(res, key) {
        return (res || {})[key];
    }, object);
}

function capitalize(str) {
    if (str) {
        str = str.toString();
        return str[0].toUpperCase() + str.slice(1).toLowerCase(); }

    return str;
}

function getFloatingNavItems(resume) {
    var floating_nav_items = [
        {label: 'Bio', target: 'about', icon: 'board', requires: 'basics.summary'},
        {label: 'Research Interests', target: 'interests', icon: 'heart', requires: 'interests'},
        {label: 'Work Experience', target: 'work-experience', icon: 'office', requires: 'work'},
        {label: 'Education', target: 'education', icon: 'graduation-cap', requires: 'education'},
        {label: 'Volunteer Work', target: 'volunteer-work', icon: 'child', requires: 'volunteer'},
        {label: 'Awards', target: 'awards', icon: 'trophy', requires: 'awards'},
        {label: 'Projects', target: 'projects', icon: 'list', requires: 'projects'},
        {label: 'Skills', target: 'skills', icon: 'tools', requires: 'skills'},
        {label: 'Publications', target: 'publications', icon: 'newspaper', requires: 'publications'},
        {label: 'References', target: 'references', icon: 'thumbs-up', requires: 'references'}
    ];

    return _(floating_nav_items).filter(function(item) {
        var value = interpolate(resume, item.requires);

        return !_.isEmpty(value);
    });
}

function render(resume) {
    var addressValues;
    var addressAttrs = ['address', 'city', 'region', 'countryCode', 'postalCode'];
    var css = fs.readFileSync(__dirname + '/assets/css/theme.css', 'utf-8');

    resume.basics.picture = utils.getUrlForPicture(resume);

    addressValues = _(addressAttrs).map(function(key) {
        return resume.basics.location[key];
    });

    resume.basics.computed_location = _.compact(addressValues).join(', ');

    if (resume.languages) {
        resume.basics.languages = _.pluck(resume.languages, 'language').join(', ');
    }

    _(resume.basics.profiles).each(function(profile) {
        var label = profile.network.toLowerCase();

        profile.url = utils.getUrlForProfile(resume, label);
        profile.label = label;
    });

    resume.basics.top_five_profiles = resume.basics.profiles.slice(0, 5);
    resume.basics.remaining_profiles = resume.basics.profiles.slice(5);

    _.each(resume.work, function(work_info) {
        var end_date;
        var start_date = moment(work_info.startDate, "YYYY-MM-DD");
        var did_leave_company = !!work_info.endDate;

        if (work_info.endDate) {
            end_date = moment(work_info.endDate, "YYYY-MM-DD");
            work_info.endDate = utils.getFormattedDate(end_date);
        }

        if (start_date) {
            end_date = end_date ? moment(end_date) : moment();
            work_info.startDate = utils.getFormattedDate(start_date);

            work_info.duration = moment.preciseDiff(start_date, end_date);
        }
    });

    _.each(resume.education, function(education_info) {
        _.each(['startDate', 'endDate'], function(type) {
            var date = education_info[type];

            if (date) {
                education_info[type] = utils.getFormattedDate(date);

                var end_date = new Date(date);
                var current_date = new Date();

                if (end_date > current_date) {
                  education_info[type] += " (expected)";
                }
            }
        });
    });

    _.each(resume.projects, function(project_info) {
        var duration;
        var start_date = project_info.startDate;
        var end_date = project_info.endDate;
        var did_leave_company = !!end_date;

        if (end_date) {
            project_info.endDate = utils.getFormattedDate(end_date);
        }

        if (start_date) {
            end_date = end_date || new Date();
            duration = utils.getDuration(start_date, end_date);
            project_info.startDate = utils.getFormattedDate(start_date);

            if (!duration.years() && !duration.months() && duration.days() > 1) {
                project_info.duration = 'Recently joined';
            } else {
                project_info.duration = utils.getDuration(start_date, end_date, true);
            }
        }
    });

    _.each(resume.volunteer, function(volunteer_info) {
        _.each(['startDate', 'endDate'], function (type) {
            var date = volunteer_info[type];

            if (date) {
                volunteer_info[type] = utils.getFormattedDate(date);
            }
        });
    });

    _.each(resume.skills, function(skill_info) {
        var levels = ['Beginner', 'Intermediate', 'Advanced', 'Master'];

        if (skill_info.level) {
            skill_info.skill_class = skill_info.level.toLowerCase();
            skill_info.level = capitalize(skill_info.level.trim());
            skill_info.display_progress_bar = _.contains(levels, skill_info.level);
        }
    });

    _.each(resume.awards, function(award) {
        var date = award.date;

        if (date) {
            award.date = utils.getFormattedDate(date, 'MMM DD, YYYY');
        }
    });

    _.each(resume.publications, function(publication_info) {
        var date = publication_info.releaseDate;

        if (date) {
            publication_info.releaseDate = utils.getFormattedDate(date, 'MMM DD, YYYY');
        }

        publication_info.author = publication_info.author.replace("Dongkwan Kim", "<u><b>Dongkwan Kim</b></u>")
    });

    return jade.renderFile(__dirname + '/index.jade', {
      resume: resume,
      floating_nav_items: getFloatingNavItems(resume),
      css: css,
      _: _
    });
}

module.exports = {
    render: render
};
