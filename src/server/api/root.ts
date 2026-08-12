import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { programRouter } from "~/server/api/routers/program";
import { institutionRouter } from "~/server/api/routers/institution";
import { courseRouter } from "~/server/api/routers/course";
import { studentRouter } from "~/server/api/routers/student";
import { assessmentRouter } from "~/server/api/routers/assessment";
import { courseResourceRouter } from "~/server/api/routers/courseResource";
import { libraryResourceRouter } from "~/server/api/routers/libraryResource";
import { studentCourseRouter } from "~/server/api/routers/studentCourse";
import { studentProgramRouter } from "~/server/api/routers/studentProgram";
import { enrollmentRouter } from "~/server/api/routers/enrollment";
import { studentProfileRouter } from "~/server/api/routers/studentProfile";
import { jobRouter } from "~/server/api/routers/job";
import { candidateRouter } from "~/server/api/routers/candidate";


export const appRouter = createTRPCRouter({
  program: programRouter,
  institution: institutionRouter,
  course: courseRouter,
  student: studentRouter,
  assessment: assessmentRouter,
  courseResource: courseResourceRouter,
  libraryResource: libraryResourceRouter,
  studentCourse: studentCourseRouter,
  studentProgram: studentProgramRouter,
  enrollment: enrollmentRouter,
  studentProfile: studentProfileRouter,
  job: jobRouter,
  candidate: candidateRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);