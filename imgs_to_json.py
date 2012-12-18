import os

#get current working directory
subdir = raw_input("type a subdirectory (or empty): ")
path = os.getcwd() + "\\" + subdir + "\\"

json = open("images.json","w")

json.write("[\n\t")

first = True
#loop through all the files in directory
for f in os.listdir(path):
    #get filename and extension
    fileName, fileExtension = os.path.splitext(f)

    #if image has a valid image extension
    if fileExtension in [".jpeg",".jpg",".png",".bmp",".gif",".tif"]:
        if first:
            first = False
        else:
            json.write(",")
        json.write("{\n")
        json.write("\t\t\"id\":\""+fileName+"\",\n")
        json.write("\t\t\"src\":\""+subdir+"/"+fileName+fileExtension+"\"\n")
        json.write("\t}")
        
        print fileName+fileExtension+" written to file"

json.write("\n]")
json.close()

print "done."
