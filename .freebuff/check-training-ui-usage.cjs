const fs=require('fs');
const baseDir='.';
const targets=[
'listTrainings','searchTrainings','createTraining','getTrainingById','updateTraining','deleteTraining','duplicateTraining','updateTrainingStatus','unpublishTraining','archiveTraining',
'getTrainingSections','createTrainingSection','updateTrainingSection','reorderTrainingSections','reorderTrainingModules',
'createTrainingLesson','updateTrainingLesson','deleteTrainingLesson','reorderTrainingLessons',
'listTrainingAssessments','createTrainingAssessment','getTrainingQuestionBank','addAssessmentQuestions','submitTrainingAssessment','gradeAssessmentSubmission','getAssessmentSubmissionReview',
'listTrainingAssignments','createTrainingAssignment','deleteTrainingAssignment','submitTrainingAssignment','gradeAssignmentSubmission',
'listMyTrainingEnrolments','enrolInTraining','listTrainingEnrolments','cancelTrainingEnrolment','approveTrainingEnrolment',
'checkoutTraining','listTrainingOrders','patchTrainingOrderStatus','refundTrainingOrder','decideTrainingOrderRefund',
'joinTrainingWaitlist','leaveTrainingWaitlist',
'getTrainingProgress','getTrainingContent','getTrainingLesson','completeTrainingLesson',
'listTrainingLiveSessions','createTrainingLiveSession','markLiveSessionAttendance',
'getTrainingCertificate','downloadTrainingCalendar','getTrainingMeetingLink',
'listTrainingDiscussions','createTrainingDiscussion','createTrainingAnnouncement',
'listPendingTrainings','approveTraining','rejectTraining','publishTraining','publishTrainingEnterprise','suspendTraining','cancelTraining',
'deleteTrainingSection','listLessonTopics','createLessonTopic','updateLessonTopic','deleteLessonTopic',
'updateTrainingAssessment','deleteTrainingAssessment','deleteAssessmentQuestion',
'getLiveSessionAttendance','exportLiveSessionAttendance','listTrainingAnnouncements','createDiscussionReply',
'getTrainingModerationHistory','getTrainingAdminNotes','resubmitTraining'];
const usage={};
const re=new RegExp('\\b('+targets.join('|')+')\\b');
(function walkDir(dir){
  let results=[]; try{ const dirEntries=fs.readdirSync(dir,{withFileTypes:true}); }catch(e){return results;}
  for(const ent of dirEntries){
    const fullPath=dir+'/'+ent.name;
    if(e.isDirectory() && !e.name.startsWith('.') && e.name!=='node_modules' && e.name!=='.next' && e.name!=='.freebuff') results=results.concat(walkDir(full));
    else if(e.isFile() && (e.name.endsWith('.ts')||e.name.endsWith('.tsx'))) results.push(full);
  }
  return results;
})(baseDir);
const files=[...new Set(walkDir(baseDir).filter(f=>/apps|packages/.test(f)))];
for(const f of files){
  let txt=''; try{txt=fs.readFileSync(f,'utf8');}catch(e){continue;}
  const found=new Set();
  let m;
  while((m=re.exec(txt))!==null){ found.add(m[1]); }
  for(const fn of found) (usage[fn]??=new Set()).add(f.replace(/^.*[\/\\]/,''));
}
const order={};
for(const fn of Object.keys(usage).sort()) order[fn]=Array.from(usage[fn]).length;
console.log('service function => UI files using it (count)');
for(const fn of targets) console.log((order[fn]||0), fn);
const used=Object.values(order).filter(n=>n>0).length;
console.log('---');
console.log('with UI usage:', used, '/', targets.length);
console.log('service-only (0 UI files):');
for(const fn of targets) if(!order[fn]) console.log(' -', fn);
