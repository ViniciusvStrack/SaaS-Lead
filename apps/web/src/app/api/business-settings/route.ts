import { cookies } from "next/headers";
import { NextResponse } from "next/server";
async function forward(request:Request,method:"GET"|"PUT"){const baseUrl=process.env.API_BASE_URL;const session=(await cookies()).get("saas_lead_session")?.value;if(!baseUrl||!session)return NextResponse.json({message:"Authentication required"},{status:401});const response=await fetch(`${baseUrl.replace(/\/$/,"")}/business-settings`,{method,headers:{Cookie:`saas_lead_session=${encodeURIComponent(session)}`,...(method==="PUT"?{"Content-Type":"application/json"}:{})},...(method==="PUT"?{body:await request.text()}:{}),cache:"no-store"});return new NextResponse(await response.text(),{status:response.status,headers:{"Content-Type":response.headers.get("content-type")??"application/json"}});}
export async function GET(request:Request){return forward(request,"GET");}
export async function PUT(request:Request){return forward(request,"PUT");}
